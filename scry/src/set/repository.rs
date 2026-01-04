use crate::{
    database::ConnectionPool,
    set::models::{Set, SetPrice},
};
use anyhow::{Ok, Result};
use sqlx::QueryBuilder;
use std::sync::Arc;
use tracing::warn;

#[derive(Clone)]
pub struct SetRepository {
    db: Arc<ConnectionPool>,
}

impl SetRepository {
    pub fn new(db: Arc<ConnectionPool>) -> Self {
        Self { db }
    }

    pub async fn count(&self) -> Result<i64> {
        let count = self.db.count("SELECT COUNT(*) FROM \"set\"").await?;
        Ok(count)
    }

    pub async fn fetch_empty_sets(&self) -> Result<Vec<Set>> {
        let qb = QueryBuilder::new(
            "SELECT * FROM \"set\" s
            WHERE NOT EXISTS (
                SELECT 1 FROM card c WHERE c.set_code = s.code
            ) ORDER BY s.code",
        );
        let result: Vec<Set> = self.db.fetch_all_query_builder(qb).await?;
        Ok(result)
    }

    pub async fn fetch_missing_prices(&self, threshold_pct: f64) -> Result<Vec<Set>> {
        let mut qb = QueryBuilder::new(
            "SELECT * FROM \"set\" s
            WHERE s.code IN (
                SELECT c.set_code 
                FROM card c
                LEFT JOIN price p ON p.card_id = c.id
                GROUP BY c.set_code
                HAVING (COUNT(DISTINCT p.card_id)::float / NULLIF(COUNT(*), 0)) < ",
        );
        qb.push_bind(threshold_pct);
        qb.push(")");
        let result: Vec<Set> = self.db.fetch_all_query_builder(qb).await?;
        Ok(result)
    }

    pub async fn save_sets(&self, sets: &[Set]) -> Result<i64> {
        if sets.is_empty() {
            warn!("0 sets given, 0 sets saved.");
            return Ok(0);
        }
        let mut query_builder = QueryBuilder::new(
            "INSERT INTO \"set\" (
                code, base_size, block, keyrune_code,
                name, parent_code, release_date, type 
            )",
        );
        query_builder.push_values(sets, |mut b, set| {
            b.push_bind(&set.code)
                .push_bind(&set.base_size)
                .push_bind(&set.block)
                .push_bind(&set.keyrune_code)
                .push_bind(&set.name)
                .push_bind(&set.parent_code)
                .push_bind(&set.release_date)
                .push_bind(&set.set_type);
        });
        query_builder.push(
            " ON CONFLICT (code) DO UPDATE SET 
            base_size = EXCLUDED.base_size,
            block = EXCLUDED.block,
            keyrune_code = EXCLUDED.keyrune_code,
            name = EXCLUDED.name,
            parent_code = EXCLUDED.parent_code,
            release_date = EXCLUDED.release_date,
            type = EXCLUDED.type
        WHERE
            set.base_size IS DISTINCT FROM EXCLUDED.base_size OR
            set.block IS DISTINCT FROM EXCLUDED.block OR
            set.keyrune_code IS DISTINCT FROM EXCLUDED.keyrune_code OR
            set.name IS DISTINCT FROM EXCLUDED.name OR
            set.parent_code IS DISTINCT FROM EXCLUDED.parent_code OR
            set.release_date IS DISTINCT FROM EXCLUDED.release_date OR
            set.type IS DISTINCT FROM EXCLUDED.type",
        );
        self.db.execute_query_builder(query_builder).await
    }

    pub async fn fetch_set_codes_with_prices(&self) -> Result<Vec<String>> {
        let qb = QueryBuilder::new(
            "SELECT DISTINCT c.set_code FROM card c
             JOIN price p ON p.card_id = c.id",
        );
        let rows: Vec<(String,)> = self.db.fetch_all_query_builder(qb).await?;
        Ok(rows.into_iter().map(|r| r.0).collect())
    }

    pub async fn calculate_set_prices(&self, codes: &[String]) -> Result<Vec<SetPrice>> {
        if codes.is_empty() {
            return Ok(Vec::new());
        }
        let mut qb = QueryBuilder::new(
            "SELECT c.set_code AS set_code,
                COALESCE(SUM(COALESCE(p.normal, p.foil, 0)) FILTER (WHERE c.in_main), 0) AS base_price,
                COALESCE(SUM(COALESCE(p.normal, p.foil, 0)), 0) AS total_price,
                COALESCE(SUM(COALESCE(p.normal, 0) + COALESCE(p.foil, 0)) FILTER (WHERE c.in_main), 0) AS base_price_all,
                COALESCE(SUM(COALESCE(p.normal, 0) + COALESCE(p.foil, 0)), 0) AS total_price_all,
                MAX(p.date) AS date
            FROM card c
            JOIN price p ON p.card_id = c.id
            WHERE c.set_code IN ("
        );
        for (i, code) in codes.iter().enumerate() {
            if i > 0 {
                qb.push(",");
            }
            qb.push_bind(code);
        }
        qb.push(") GROUP BY c.set_code");
        let set_prices: Vec<SetPrice> = self.db.fetch_all_query_builder(qb).await?;
        Ok(set_prices)
    }

    pub async fn update_prices(&self, set_prices: Vec<SetPrice>) -> Result<i64> {
        if set_prices.is_empty() {
            warn!("0 set prices given, 0 prices saved.");
            return Ok(0);
        }
        let mut qb = QueryBuilder::new(
            "INSERT INTO set_price (set_code, base_price, total_price, base_price_all, total_price_all, date)",
        );
        qb.push_values(&set_prices, |mut b, sp| {
            b.push_bind(&sp.set_code)
                .push_bind(&sp.base_price)
                .push_bind(&sp.total_price)
                .push_bind(&sp.base_price_all)
                .push_bind(&sp.total_price_all)
                .push_bind(&sp.date);
        });
        qb.push(
            " ON CONFLICT (set_code) DO UPDATE SET
                base_price = EXCLUDED.base_price,
                total_price = EXCLUDED.total_price,
                base_price_all = EXCLUDED.base_price_all,
                total_price_all = EXCLUDED.total_price_all,
                date = EXCLUDED.date
            WHERE
                set_price.base_price IS DISTINCT FROM EXCLUDED.base_price OR
                set_price.total_price IS DISTINCT FROM EXCLUDED.total_price OR
                set_price.base_price_all IS DISTINCT FROM EXCLUDED.base_price_all OR
                set_price.total_price_all IS DISTINCT FROM EXCLUDED.total_price_all OR
                set_price.date IS DISTINCT FROM EXCLUDED.date",
        );
        self.db.execute_query_builder(qb).await
    }

    pub async fn delete_all(&self) -> Result<i64> {
        let qb = QueryBuilder::new("DELETE FROM set CASCADE");
        self.db.execute_query_builder(qb).await
    }

    pub async fn delete_set_batch(&self, set_code: &str) -> Result<i64> {
        if set_code.is_empty() {
            return Ok(0);
        }
        let mut qb = QueryBuilder::new("WITH to_del AS (SELECT id FROM card WHERE set_code = ");
        qb.push_bind(set_code);
        qb.push(
            "),
            del_legalities AS (
                DELETE FROM legality WHERE card_id IN (SELECT id FROM to_del)
            ),
            del_prices AS (
                DELETE FROM price WHERE card_id IN (SELECT id FROM to_del)
            ),
            del_inventory AS (
                DELETE FROM inventory WHERE card_id IN (SELECT id FROM to_del)
            ),
            del_cards AS (
                DELETE FROM card WHERE id IN (SELECT id FROM to_del) RETURNING id
            )
            DELETE FROM \"set\" WHERE code = ",
        );
        qb.push_bind(set_code);
        let deleted = self.db.execute_query_builder(qb).await?;
        Ok(deleted)
    }

    pub async fn update_sizes(
        &self,
        base_sizes: &[(String, i64)],
        total_sizes: &[(String, i64)],
    ) -> Result<i64> {
        let mut total_updated = 0i64;
        let update_stmt = |col: &str| {
            format!(
                ") UPDATE \"set\" s SET {col} = v.size FROM vals v
                WHERE s.code = v.code AND (s.{col} IS DISTINCT FROM v.size)"
            )
        };
        if !base_sizes.is_empty() {
            let mut qb = QueryBuilder::new("WITH vals(code, size) AS (");
            qb.push_values(base_sizes, |mut b, pair| {
                b.push_bind(&pair.0).push_bind(&pair.1);
            });
            qb.push(&update_stmt("base_size"));
            total_updated += self.db.execute_query_builder(qb).await?;
        }
        if !total_sizes.is_empty() {
            let mut qb = QueryBuilder::new("WITH vals(code, size) AS (");
            qb.push_values(total_sizes, |mut b, pair| {
                b.push_bind(&pair.0).push_bind(&pair.1);
            });
            qb.push(&update_stmt("total_size"));
            total_updated += self.db.execute_query_builder(qb).await?;
        }
        Ok(total_updated)
    }
}

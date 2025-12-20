use crate::{database::ConnectionPool, set::models::Set};
use anyhow::{Ok, Result};
use sqlx::QueryBuilder;
use std::sync::Arc;
use tracing::{debug, warn};

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

    pub async fn delete_all(&self) -> Result<i64> {
        let qb = QueryBuilder::new("DELETE FROM set CASCADE");
        self.db.execute_query_builder(qb).await
    }

    pub async fn delete_set_batch(&self, set_code: &str, batch_size: i64) -> Result<i64> {
        if set_code.is_empty() {
            return Ok(0);
        }
        let mut total_deleted = 0i64;
        loop {
            let mut qb = QueryBuilder::new("WITH to_del AS (SELECT id FROM card WHERE set_code = ");
            qb.push_bind(set_code);
            qb.push(" LIMIT ");
            qb.push_bind(batch_size);
            qb.push(") DELETE FROM legality WHERE card_id IN (SELECT id FROM to_del)");
            let deleted = self.db.execute_query_builder(qb).await?;
            total_deleted += deleted;
            if deleted == 0 {
                break;
            }
        }
        debug!("Deleted {} legalities", total_deleted);
        total_deleted = 0i64;
        loop {
            let mut qb = QueryBuilder::new("WITH to_del AS (SELECT id FROM card WHERE set_code = ");
            qb.push_bind(set_code);
            qb.push(" LIMIT ");
            qb.push_bind(batch_size);
            qb.push(") DELETE FROM price WHERE card_id IN (SELECT id FROM to_del)");
            let deleted = self.db.execute_query_builder(qb).await?;
            total_deleted += deleted;
            if deleted == 0 {
                break;
            }
        }
        debug!("Deleted {} prices", total_deleted);
        total_deleted = 0i64;
        loop {
            let mut qb = QueryBuilder::new("WITH to_del AS (SELECT id FROM card WHERE set_code = ");
            qb.push_bind(set_code);
            qb.push(" LIMIT ");
            qb.push_bind(batch_size);
            qb.push(") DELETE FROM inventory WHERE card_id IN (SELECT id FROM to_del)");
            let deleted = self.db.execute_query_builder(qb).await?;
            total_deleted += deleted;
            if deleted == 0 {
                break;
            }
        }
        debug!("Deleted {} inventory items", total_deleted);
        total_deleted = 0i64;
        loop {
            let mut qb = QueryBuilder::new("WITH to_del AS (SELECT id FROM card WHERE set_code = ");
            qb.push_bind(set_code);
            qb.push(" LIMIT ");
            qb.push_bind(batch_size);
            qb.push(") DELETE FROM card WHERE id IN (SELECT id FROM to_del)");
            let deleted = self.db.execute_query_builder(qb).await?;
            total_deleted += deleted;
            if deleted == 0 {
                break;
            }
        }
        debug!("Deleted {} cards", total_deleted);
        let mut qb = QueryBuilder::new("DELETE FROM \"set\" WHERE code = ");
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

        if !base_sizes.is_empty() {
            let mut qb = QueryBuilder::new("WITH vals(code, size) AS (");
            qb.push_values(base_sizes, |mut b, pair| {
                b.push_bind(&pair.0).push_bind(&pair.1);
            });
            qb.push(
                ") UPDATE \"set\" s SET base_size = v.size FROM vals v WHERE s.code = v.code AND (s.base_size IS DISTINCT FROM v.size)",
            );
            total_updated += self.db.execute_query_builder(qb).await?;
        }

        if !total_sizes.is_empty() {
            let mut qb = QueryBuilder::new("WITH vals(code, size) AS (");
            qb.push_values(total_sizes, |mut b, pair| {
                b.push_bind(&pair.0).push_bind(&pair.1);
            });
            qb.push(
                ") UPDATE \"set\" s SET total_size = v.size FROM vals v WHERE s.code = v.code AND (s.total_size IS DISTINCT FROM v.size)",
            );
            total_updated += self.db.execute_query_builder(qb).await?;
        }
        Ok(total_updated)
    }
}

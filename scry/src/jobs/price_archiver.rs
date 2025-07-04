use anyhow::Result;
use chrono::Utc;
use sqlx::PgPool;

use crate::config::Config;
use crate::models::Price;

pub struct PriceArchiver {
    pub pool: PgPool,
    pub(crate) config: Config,
}

impl PriceArchiver {
    pub fn new(pool: PgPool, config: Config) -> Self {
        Self { pool, config }
    }

    async fn scry_old_prices_batch(&self, cutoff_date: chrono::NaiveDate) -> Result<Vec<Price>> {
        let prices = sqlx::query_as::<_, Price>(
            "SELECT id, card_id, foil, normal, date, created_at, updated_at 
             FROM prices 
             WHERE date < $1 
             ORDER BY date ASC 
             LIMIT $2",
        )
        .bind(cutoff_date)
        .bind(self.config.archive_batch_size)
        .fetch_all(&self.pool)
        .await?;

        Ok(prices)
    }

    async fn bottom_prices(&self, prices: &[Price]) -> Result<i64> {
        if prices.is_empty() {
            return Ok(0);
        }
        let mut query_builder = sqlx::QueryBuilder::new(
            "INSERT INTO price_history (card_id, foil, normal, date, archived_at) ",
        );
        query_builder.push_values(prices, |mut b, price| {
            b.push_bind(&price.card_id)
                .push_bind(&price.foil)
                .push_bind(&price.normal)
                .push_bind(&price.date)
                .push_bind(Utc::now());
        });
        query_builder.push(" ON CONFLICT (card_id, date) DO NOTHING");
        let result = query_builder.build().execute(&self.pool).await?;
        Ok(result.rows_affected() as i64)
    }

    async fn remove_from_sight(&self, price_ids: &[i64]) -> Result<i64> {
        if price_ids.is_empty() {
            return Ok(0);
        }
        let result = sqlx::query("DELETE FROM prices WHERE id = ANY($1)")
            .bind(price_ids)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() as i64)
    }
}

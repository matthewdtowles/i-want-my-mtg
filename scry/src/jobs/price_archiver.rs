use anyhow::Result;
use chrono::{Duration, Utc};
use sqlx::PgPool;
use tracing::{debug, info};

use crate::config::Config;
use crate::models::{ArchiveStats, Price};

pub struct PriceArchiver {
    pub pool: PgPool,
    pub(crate) config: Config,
}

impl PriceArchiver {
    pub fn new(pool: PgPool, config: Config) -> Self {
        Self { pool, config }
    }

    pub async fn archive_old_visions(&self) -> Result<ArchiveStats> {
        let cutoff_date =
            (Utc::now() - Duration::days(self.config.price_retention_days)).date_naive();

        info!("Scrying prices older than {}", cutoff_date);
        let mut total_archived = 0i64;
        let mut total_deleted = 0i64;
        loop {
            let old_prices = self.scry_old_prices_batch(cutoff_date).await?;
            if old_prices.is_empty() {
                break;
            }
            let batch_size = old_prices.len() as i64;
            debug!("Processing batch of {} old price visions", batch_size);

            let archived_count = self.bottom_prices(&old_prices).await?;
            total_archived += archived_count;

            let price_ids: Vec<i64> = old_prices.iter().filter_map(|p| p.id).collect();
            let deleted_count = self.remove_from_sight(&price_ids).await?;
            total_deleted += deleted_count;
            debug!(
                "Batch complete: {} archived, {} removed from sight",
                archived_count, deleted_count
            );

            if batch_size < self.config.archive_batch_size {
                break;
            }
        }
        let stats = ArchiveStats {
            archived_count: total_archived,
            deleted_count: total_deleted,
            processed_date: cutoff_date,
        };

        info!("Archive vision complete: {:?}", stats);
        Ok(stats)
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

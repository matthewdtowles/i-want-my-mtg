use anyhow::Result;
use tracing::info;

use crate::database::repositories::PriceRepository;

#[derive(Clone)]
pub struct PriceArchiver {
    price_repo: PriceRepository,
}

impl PriceArchiver {
    pub fn new(price_repo: PriceRepository) -> Self {
        Self { price_repo }
    }

    pub async fn archive(&self, batch_size: i16) -> Result<u64> {
        let prices = self.price_repo.fetch_batch(batch_size).await?;

        if prices.is_empty() {
            return Ok(0);
        }

        let archived_count = self.price_repo.archive_to_history(&prices).await?;

        if archived_count == 0 {
            return Ok(0);
        }

        let price_ids: Vec<i64> = prices.iter().filter_map(|p| p.id).collect();
        let deleted_count = self.price_repo.delete_by_ids(&price_ids).await?;

        info!("Archived {} prices, deleted {} records", archived_count, deleted_count);
        Ok(deleted_count)
    }
}

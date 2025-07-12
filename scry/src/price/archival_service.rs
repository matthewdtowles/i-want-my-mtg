use anyhow::Result;
use std::sync::Arc;
use tracing::info;

use super::repository::PriceRepository;
use crate::database::ConnectionPool;

pub struct PriceArchivalService {
    repository: PriceRepository,
}

impl PriceArchivalService {
    pub fn new(connection_pool: Arc<ConnectionPool>) -> Self {
        Self {
            repository: PriceRepository::new(connection_pool),
        }
    }

    pub async fn archive(&self, batch_size: u16) -> Result<u64> {
        info!("Starting price archival with batch size: {}", batch_size);

        let prices = self.repository.fetch_for_archival(batch_size).await?;

        if prices.is_empty() {
            info!("No prices to archive");
            return Ok(0);
        }

        let archived_count = self.repository.archive_to_history(&prices).await?;
        let price_ids: Vec<i64> = prices.iter().filter_map(|p| p.id).collect();
        let deleted_count = self.repository.delete_by_ids(&price_ids).await?;

        info!(
            "Archived {} prices, deleted {} records",
            archived_count, deleted_count
        );
        Ok(deleted_count)
    }
}

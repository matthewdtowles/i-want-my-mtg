use crate::database::ConnectionPool;
use crate::price::repository::PriceRepository;
use anyhow::Result;
use std::sync::Arc;
use tracing::{info, warn};

pub struct PriceArchivalService {
    repository: PriceRepository,
    batch_size: i16,
}

impl PriceArchivalService {
    pub fn new(connection_pool: Arc<ConnectionPool>, batch_size: i16) -> Self {
        Self {
            repository: PriceRepository::new(connection_pool),
            batch_size,
        }
    }

    pub async fn archive(&self) -> Result<u64> {
        info!("Starting price archival");
        let mut archived_count = 0;
        loop {
            // read prices from price table
            let prices = self.repository.fetch_batch(self.batch_size).await?;
            if prices.is_empty() {
                // while prices is not empty
                info!("No prices to archive");
                break;
            }
            // insert into price_history table, return inserted ids
            let saved_ids = self.repository.save_to_history(&prices).await?;
            // check if any prices were missed in saved_ids
            // TODO: above
            // delete from price table
            archived_count += self.repository.delete_by_ids(&saved_ids).await?;
            archived_count += saved_ids.len() as u64;
            if archived_count != prices.len() as u64 {
                warn!(
                    "Some prices were not archived, expected: {}, archived: {}",
                    prices.len(),
                    archived_count
                );
            }
        }
        info!("Archived {} total prices", archived_count);
        Ok(archived_count)
    }
}

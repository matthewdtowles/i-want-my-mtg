use crate::price::{client::PriceClient, mapper::PriceMapper, repository::PriceRepository};
use crate::{config::Config, database::ConnectionPool, utils::http_client::HttpClient};
use anyhow::Result;
use std::sync::Arc;
use tracing::{debug, info, warn};

const BATCH_SIZE: i16 = 500;

pub struct PriceService {
    client: PriceClient,
    mapper: PriceMapper,
    repository: PriceRepository,
}

impl PriceService {
    pub fn new(
        connection_pool: Arc<ConnectionPool>,
        http_client: HttpClient,
        config: &Config,
    ) -> Self {
        Self {
            client: PriceClient::new(http_client, config.mtg_json_base_url.clone()),
            mapper: PriceMapper::new(),
            repository: PriceRepository::new(connection_pool),
        }
    }

    pub async fn ingest_all_today(&self) -> Result<u64> {
        debug!("Ingest all prices for today.");
        let raw_data = self.client.fetch_prices().await?;
        let prices = self.mapper.map_price_data(raw_data)?;
        if prices.is_empty() {
            warn!("No prices found from source");
            return Ok(0);
        }

        let count = self.repository.save(&prices).await?;
        info!("Successfully ingested {} prices", count);
        Ok(count)
    }

    pub async fn archive(&self) -> Result<u64> {
        info!("Starting price archival");
        let mut archived_count = 0;
        loop {
            // read prices from price table
            let prices = self.repository.fetch_batch(BATCH_SIZE).await?;
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

    pub async fn delete_all(&self) -> Result<u64>{
        info!("Deleting all prices.");
        self.repository.delete_all().await
    }
}

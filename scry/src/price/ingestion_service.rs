use crate::price::{client::PriceClient, mapper::PriceMapper, repository::PriceRepository};
use crate::{config::Config, database::ConnectionPool, utils::http_client::HttpClient};
use anyhow::Result;
use std::sync::Arc;
use tracing::{info, warn};

pub struct PriceIngestionService {
    client: PriceClient,
    mapper: PriceMapper,
    repository: PriceRepository,
}

impl PriceIngestionService {
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

    pub async fn ingest_from_source(&self) -> Result<u64> {
        info!("Starting price ingestion from web source");
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
}

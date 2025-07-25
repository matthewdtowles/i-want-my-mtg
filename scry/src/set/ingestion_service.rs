use crate::set::{client::SetClient, mapper::SetMapper, repository::SetRepository};
use crate::{config::Config, database::ConnectionPool, shared::http_client::HttpClient};
use anyhow::Result;
use std::sync::Arc;
use tracing::{info, warn};

pub struct SetIngestionService {
    client: SetClient,
    mapper: SetMapper,
    repository: SetRepository,
}

impl SetIngestionService {
    pub fn new(
        connection_pool: Arc<ConnectionPool>,
        http_client: HttpClient,
        config: &Config,
    ) -> Self {
        Self {
            client: SetClient::new(http_client, config.mtg_json_base_url.clone()),
            mapper: SetMapper::new(),
            repository: SetRepository::new(connection_pool),
        }
    }

    pub async fn ingest_all(&self) -> Result<u64> {
        info!("Starting MTG set ingestion");
        let raw_data = self.client.fetch_all_sets().await?;
        let sets = self.mapper.map_mtg_json_to_sets(raw_data)?;
        if sets.is_empty() {
            warn!("No sets found");
            return Ok(0);
        }
        let count = self.repository.bulk_insert(&sets).await?;
        info!("Successfully ingested {} sets", count);
        Ok(count)
    }
}

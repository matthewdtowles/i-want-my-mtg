use crate::set::{client::SetClient, mapper::SetMapper, repository::SetRepository};
use crate::{config::Config, database::ConnectionPool, utils::http_client::HttpClient};
use anyhow::Result;
use std::sync::Arc;
use tracing::{debug, info, warn};

pub struct SetService {
    client: SetClient,
    repository: SetRepository,
}

impl SetService {
    pub fn new(
        db: Arc<ConnectionPool>,
        http_client: HttpClient,
        config: &Config,
    ) -> Self {
        Self {
            client: SetClient::new(http_client, config.mtg_json_base_url.clone()),
            repository: SetRepository::new(db),
        }
    }

    pub async fn ingest_all(&self) -> Result<u64> {
        info!("Starting MTG set ingestion");
        let raw_data = self.client.fetch_all_sets().await?;
        debug!("Raw data fetched.");
        let sets = SetMapper::map_mtg_json_to_sets(raw_data)?;
        debug!("Mapping complete. {} sets found.", sets.len());
        if sets.is_empty() {
            warn!("No sets found");
            return Ok(0);
        }
        debug!("Bulk insert into repository.");
        let count = self.repository.save_sets(&sets).await?;
        info!("Successfully ingested {} sets", count);
        Ok(count)
    }

    pub async fn delete_all(&self) -> Result<u64> {
        info!("Deleting all sets.");
        self.repository.delete_all().await
    }
}

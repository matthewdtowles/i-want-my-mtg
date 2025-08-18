use crate::set::{mapper::SetMapper, repository::SetRepository};
use crate::{database::ConnectionPool, utils::http_client::HttpClient};
use anyhow::Result;
use std::sync::Arc;
use tracing::{debug, info, warn};

pub struct SetService {
    client: Arc<HttpClient>,
    repository: SetRepository,
}

impl SetService {
    pub fn new(db: Arc<ConnectionPool>, http_client: Arc<HttpClient>) -> Self {
        Self {
            client: http_client,
            repository: SetRepository::new(db),
        }
    }

    pub async fn fetch_count(&self) -> Result<u64> {
        self.repository.count().await
    }

    pub async fn ingest_all(&self) -> Result<u64> {
        debug!("Starting MTG set ingestion");
        let raw_data = self.client.fetch_all_sets().await?;
        debug!("Raw data fetched.");
        let sets = SetMapper::map_mtg_json_to_sets(raw_data)?;
        debug!("{} sets found.", sets.len());
        if sets.is_empty() {
            warn!("No sets found");
            return Ok(0);
        }
        let count = self.repository.save_sets(&sets).await?;
        info!("Successfully ingested {} sets", count);
        Ok(count)
    }

    pub async fn delete_all(&self) -> Result<u64> {
        info!("Deleting all sets.");
        self.repository.delete_all().await
    }
}

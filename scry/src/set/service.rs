use crate::set::models::Set;
use crate::set::{mapper::SetMapper, repository::SetRepository};
use crate::{database::ConnectionPool, utils::http_client::HttpClient};
use anyhow::Result;
use serde_json::Value;
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

    pub async fn ingest_all(&self, cleanup_online: bool) -> Result<u64> {
        debug!("Starting MTG set ingestion");
        let raw_data: Value = self.client.fetch_all_sets().await?;
        debug!("Raw data fetched.");
        let mut to_save: Vec<Set> = Vec::new();
        if let Some(arr) = raw_data.get("data").and_then(|d| d.as_array()) {
            for set_obj in arr {
                let code = set_obj
                    .get("code")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_lowercase());
                if code.is_none() {
                    continue;
                }
                let code = code.unwrap();
                let is_online = set_obj
                    .get("isOnlineOnly")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                if cleanup_online && is_online {
                    let _ = self
                        .repository
                        .delete_set_and_dependents_batched(&code, 500)
                        .await?;
                    continue;
                }
                if !(is_online) {
                    match SetMapper::map_mtg_json_to_set(set_obj, cleanup_online) {
                        Ok(set) => to_save.push(set),
                        Err(e) => warn!("Failed to map set {}: {}", code, e),
                    }
                }
            }
        }
        if to_save.is_empty() {
            info!("No sets to save.");
            return Ok(0);
        }
        let count = self.repository.save_sets(&to_save).await?;
        info!("Successfully ingested {} sets", count);
        Ok(count)
    }

    pub async fn delete_all(&self) -> Result<u64> {
        info!("Deleting all sets.");
        self.repository.delete_all().await
    }
}

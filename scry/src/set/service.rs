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

    pub async fn ingest_all(&self) -> Result<u64> {
        debug!("Starting MTG set ingestion");
        let raw_data: Value = self.client.fetch_all_sets().await?;
        debug!("Raw data fetched.");
        let mut to_save: Vec<Set> = Vec::new();
        if let Some(arr) = raw_data.get("data").and_then(|d| d.as_array()) {
            for set_obj in arr {
                if let Some(code) = set_obj.get("code").and_then(|v| v.as_str()) {
                    let code = code.to_lowercase();
                    let is_online = set_obj
                        .get("isOnlineOnly")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);
                    if is_online {
                        continue;
                    }
                    match SetMapper::map_mtg_json_to_set(set_obj) {
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

    pub async fn cleanup_delete_online_sets(&self, batch_size: i64) -> Result<u64> {
        debug!("Starting cleanup: delete online-only sets");
        let raw_data: Value = self.client.fetch_all_sets().await?;
        let mut total_deleted = 0u64;
        if let Some(arr) = raw_data.get("data").and_then(|d| d.as_array()) {
            for set_obj in arr {
                if let Some(code) = set_obj.get("code").and_then(|v| v.as_str()) {
                    let code = code.to_lowercase();
                    let is_online = set_obj
                        .get("isOnlineOnly")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);
                    if is_online {
                        let n = self
                            .repository
                            .delete_set_and_dependents_batched(&code, batch_size)
                            .await?;
                        total_deleted += n;
                    }
                }
            }
        }
        info!(
            "Cleanup deleted {} rows for online-only sets",
            total_deleted
        );
        Ok(total_deleted)
    }

    pub async fn delete_all(&self) -> Result<u64> {
        info!("Deleting all sets.");
        self.repository.delete_all().await
    }
}

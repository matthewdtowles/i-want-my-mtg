use crate::set::models::Set;
use crate::set::{mapper::SetMapper, repository::SetRepository};
use crate::{database::ConnectionPool, utils::http_client::HttpClient};
use anyhow::Result;
use serde_json::Value;
use std::sync::Arc;
use tracing::{debug, warn};

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
                    match SetMapper::map_mtg_json_to_set(set_obj) {
                        Ok(set) => {
                            if !Self::should_filter(&set) {
                                to_save.push(set);
                            }
                        }
                        Err(e) => warn!("Failed to map set {}: {}", code, e),
                    }
                }
            }
        }
        if to_save.is_empty() {
            debug!("No sets to save.");
            return Ok(0);
        }
        let count = self.repository.save_sets(&to_save).await?;
        debug!("Successfully ingested {} sets", count);
        Ok(count)
    }

    pub async fn cleanup_sets(&self, batch_size: i64) -> Result<u64> {
        debug!("Starting cleanup for sets");
        let raw_data: Value = self.client.fetch_all_sets().await?;
        let mut total_deleted = 0u64;
        if let Some(arr) = raw_data.get("data").and_then(|d| d.as_array()) {
            for set_obj in arr {
                if let Some(code) = set_obj.get("code").and_then(|v| v.as_str()) {
                    let code = code.to_lowercase();
                    if let Ok(set) = SetMapper::map_mtg_json_to_set(set_obj) {
                        if Self::should_filter(&set) {
                            total_deleted +=
                                self.repository.delete_set_batch(&code, batch_size).await?;
                        }
                    }
                }
            }
        }
        debug!("Total sets deleted: {}", total_deleted);
        Ok(total_deleted)
    }

    pub async fn delete_all(&self) -> Result<u64> {
        debug!("Deleting all sets.");
        self.repository.delete_all().await
    }

    pub async fn prune_empty_sets(&self) -> Result<u64> {
        debug!("Deleting sets that do not have any cards.");
        let empty_sets: Vec<Set> = self.repository.fetch_empty_sets().await?;
        debug!("Found {} empty sets", empty_sets.len());
        if empty_sets.is_empty() {
            return Ok(0);
        }
        let mut total_deleted = 0u64;
        for set in empty_sets {
            let code = set.code.to_lowercase();
            let n = self.repository.delete_set_batch(&code, 100).await?;
            total_deleted += n;
        }
        debug!("Deleted {} rows for empty sets", total_deleted);
        Ok(total_deleted)
    }

    fn should_filter(set: &Set) -> bool {
        if set.is_online_only || set.is_foreign_only || set.set_type == "memorabilia" {
            return true;
        }
        false
    }
}

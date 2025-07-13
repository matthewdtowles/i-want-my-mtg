use crate::shared::http_client::HttpClient;
use anyhow::Result;
use serde_json::Value;
use std::sync::Arc;
use tracing::info;

pub struct SetClient {
    http_client: HttpClient,
    base_url: Arc<str>,
}

impl SetClient {
    pub fn new(http_client: HttpClient, base_url: Arc<str>) -> Self {
        Self {
            http_client,
            base_url,
        }
    }

    pub async fn fetch_set(&self, set_code: &str) -> Result<Value> {
        let url = format!("{}/{}.json", self.base_url, set_code);
        info!("Fetching set data for set: {}", set_code);
        self.http_client.get_json(&url).await
    }

    pub async fn fetch_all_sets(&self) -> Result<Value> {
        let url = format!("{}/AllSets.json", self.base_url);
        info!("Fetching all sets data");
        self.http_client.get_json(&url).await
    }
}

use crate::utils::http_client::HttpClient;
use anyhow::Result;
use serde_json::Value;
use std::sync::Arc;
use tracing::{error, info};

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

    pub async fn fetch_all_sets(&self) -> Result<Value> {
        let url = format!("{}/SetList.json", self.base_url);
        info!("Fetching all sets data from url: {}", url);
        let result = self.http_client.get_json(&url).await;
        match &result {
            Ok(_) => info!("SetClient: Successfully fetched all sets data"),
            Err(e) => error!("SetClient: Error fetching all sets data: {}", e),
        }
        result
    }
}

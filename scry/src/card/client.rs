use crate::shared::http_client::HttpClient;
use anyhow::Result;
use serde_json::Value;
use std::sync::Arc;
use tracing::info;

pub struct CardClient {
    http_client: HttpClient,
    base_url: Arc<str>,
}

impl CardClient {
    pub fn new(http_client: HttpClient, base_url: Arc<str>) -> Self {
        Self {
            http_client,
            base_url,
        }
    }

    pub async fn fetch_set_cards(&self, set_code: &str) -> Result<Value> {
        let url = format!("{}/{}.json", self.base_url, set_code);
        info!("Fetching card data for set: {}", set_code);
        self.http_client.get_json(&url).await
    }

    pub async fn fetch_all_cards(&self) -> Result<Value> {
        let url = format!("{}/AllPrintings.json", self.base_url);
        info!("Fetching all card data");
        self.http_client.get_json(&url).await
    }
}

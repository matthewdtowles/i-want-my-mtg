use crate::shared::http_client::HttpClient;
use anyhow::Result;
use serde_json::Value;
use std::sync::Arc;

pub struct PriceClient {
    http_client: HttpClient,
    base_url: Arc<str>,
}

impl PriceClient {
    pub fn new(http_client: HttpClient, base_url: Arc<str>) -> Self {
        Self {
            http_client,
            base_url,
        }
    }

    pub async fn fetch_prices(&self, set_code: &str) -> Result<Value> {
        let url = format!("{}/prices/{}.json", self.base_url, set_code);
        tracing::info!("Fetching prices for set: {}", set_code);
        self.http_client.get_json(&url).await
    }
}

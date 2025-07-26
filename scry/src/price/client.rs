use crate::utils::http_client::HttpClient;
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

    pub async fn fetch_prices(&self) -> Result<Value> {
        let url = format!("{}/AllPricesToday.json", self.base_url);
        tracing::info!("Fetching all prices for today.");
        self.http_client.get_json(&url).await
    }
}

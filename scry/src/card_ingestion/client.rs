// src/card_ingestion/client.rs
use anyhow::Result;
use serde_json::Value;
use tracing::info;

use crate::config::Config;
use crate::shared::http_client::HttpClient;

pub struct CardClient {
    http_client: HttpClient,
    base_url: String,
}

impl CardClient {
    pub fn new(http_client: HttpClient, config: &Config) -> Self {
        Self {
            http_client,
            base_url: config.mtg_json_base_url.clone(),
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


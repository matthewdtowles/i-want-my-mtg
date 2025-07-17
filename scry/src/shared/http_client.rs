use anyhow::Result;
use bytes::Bytes;
use futures::StreamExt;
use reqwest::Client;
use serde::de::DeserializeOwned;
use std::time::Duration;

#[derive(Clone)]
pub struct HttpClient {
    client: Client,
}

impl HttpClient {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(1800)) // 30 minutes for large downloads
            .connect_timeout(Duration::from_secs(30))
            .user_agent("scry-mtg-tool/1.0")
            .build()
            .expect("Failed to create HTTP client");

        Self { client }
    }

    pub async fn get_json<T>(&self, url: &str) -> Result<T>
    where
        T: DeserializeOwned,
    {
        let response = self.client.get(url).send().await?;
        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "HTTP request failed: {}",
                response.status()
            ));
        }
        Ok(response.json::<T>().await?)
    }

    pub async fn get_bytes_stream(
        &self,
        url: &str,
    ) -> Result<impl futures::Stream<Item = Result<Bytes>>> {
        let response = self.client.get(url).send().await?;
        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "HTTP request failed: {}",
                response.status()
            ));
        }
        Ok(response
            .bytes_stream()
            .map(|result| result.map_err(anyhow::Error::from)))
    }
}

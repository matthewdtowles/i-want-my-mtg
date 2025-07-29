use anyhow::Result;
use bytes::Bytes;
use futures::Stream;
use reqwest::Client;
use serde::de::DeserializeOwned;

#[derive(Clone)]
pub struct HttpClient {
    client: Client,
}

impl HttpClient {
    const BASE_INGESTION_URL: &str = "https://mtgjson.com/api/v5/";

    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    pub async fn get_json<T>(&self, url_path: &str) -> Result<T>
    where
        T: DeserializeOwned,
    {
        let url = format!("{}{}", Self::BASE_INGESTION_URL, url_path);
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
        url_path: &str,
    ) -> Result<impl Stream<Item = Result<Bytes, reqwest::Error>>> {
        let url = format!("{}{}", Self::BASE_INGESTION_URL, url_path);
        let response = self.client.get(url).send().await?.error_for_status()?;
        let byte_stream = response.bytes_stream();
        Ok(byte_stream)
    }
}

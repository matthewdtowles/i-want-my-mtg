use anyhow::Result;
use bytes::Bytes;
use futures::{Stream, StreamExt};
use reqwest::Client;
use serde::de::DeserializeOwned;

#[derive(Clone)]
pub struct HttpClient {
    client: Client,
}

impl HttpClient {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
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

    pub async fn get_bytes_stream(&self, url: &str) -> Result<impl Stream<Item = Result<Bytes, reqwest::Error>>> {
        let response = self.client.get(url).send().await?.error_for_status()?;
        let byte_stream = response.bytes_stream();
        Ok(byte_stream)
    }

    pub async fn get_readable_stream(&self, url: &str) -> Result<impl Stream<Item = crate::Result<Bytes>>> {
        let response = self.client.get(url).send().await?.error_for_status()?;
        Ok(response.bytes_stream().map(|result| result.map_err(Into::into)))
    }
}

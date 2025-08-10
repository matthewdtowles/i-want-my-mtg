use crate::utils::streaming::StreamingJsonParser;
use actson::{tokio::AsyncBufReaderJsonFeeder, JsonParser};
use anyhow::Result;
use bytes::Bytes;
use futures::{Stream, StreamExt};
use reqwest::Client;
use serde::de::DeserializeOwned;
use tokio::io::BufReader;
use tokio_util::io::StreamReader;

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

    pub async fn get_json_parser(
        &self,
        url_path: &str,
        buf_size: usize,
    ) -> Result<
        JsonParser<
            AsyncBufReaderJsonFeeder<
                BufReader<StreamReader<impl Stream<Item = Result<Bytes, reqwest::Error>>, Bytes>>,
            >,
        >,
        anyhow::Error,
    > {
        let byte_stream = self.get_bytes_stream(url_path).await?;
        let stream_reader =
            StreamReader::new(byte_stream.map(|result| {
                result.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
            }));
        let buf_reader = BufReader::with_capacity(buf_size, stream_reader);
        let feeder = AsyncBufReaderJsonFeeder::new(buf_reader);
        let parser = JsonParser::new(feeder);
        Ok(parser)
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

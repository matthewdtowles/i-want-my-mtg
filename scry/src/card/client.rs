use crate::shared::http_client::HttpClient;
use anyhow::Result;
use futures::{Stream, StreamExt};
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

    pub async fn fetch_set_cards(
        &self,
        set_code: &str,
    ) -> Result<impl Stream<Item = Result<Value>>> {
        let url = format!("{}/{}.json", self.base_url, set_code);
        info!("Fetching cards for set: {}", set_code);
        let json: Value = self.http_client.get_json(&url).await?;
        if let Some(cards) = json.get("data").and_then(|d| d.as_array()) {
            let cards_vec: Vec<Value> = cards.iter().cloned().collect();
            Ok(futures::stream::iter(cards_vec.into_iter().map(Ok)))
        } else {
            Err(anyhow::anyhow!("No 'data' array found in response"))
        }
    }

    // TRUE STREAMING approach - for AllPrintings.json
    pub async fn fetch_all_cards_streaming(&self) -> Result<impl Stream<Item = Result<Value>>> {
        let url = format!("{}/AllPrintings.json", self.base_url);
        info!("Starting streaming ingestion of all cards");
        let byte_stream = self.http_client.get_bytes_stream(&url).await?;
        Ok(self.parse_streaming_json(byte_stream))
    }

    // Parse streaming JSON into individual card objects
    fn parse_streaming_json(
        &self,
        byte_stream: impl Stream<Item = Result<bytes::Bytes>>,
    ) -> impl Stream<Item = Result<Value>> {
        async_stream::stream! {
            let mut buffer = Vec::new();
            let mut in_data_array = false;
            let mut brace_count = 0;
            let mut current_card = Vec::new();
            let mut bytes_stream = Box::pin(byte_stream);
            while let Some(chunk_result) = bytes_stream.next().await {
                match chunk_result {
                    Ok(chunk) => {
                        buffer.extend_from_slice(&chunk);
                        // Process bytes looking for complete JSON objects
                        let mut i = 0;
                        while i < buffer.len() {
                            let byte = buffer[i];
                            match byte {
                                b'"' if !in_data_array => {
                                    // Look for "data" field
                                    if buffer[i..].starts_with(b"\"data\"") {
                                        // Skip to the array start
                                        while i < buffer.len() && buffer[i] != b'[' {
                                            i += 1;
                                        }
                                        if i < buffer.len() {
                                            in_data_array = true;
                                            i += 1; // Skip the '['
                                        }
                                        continue;
                                    }
                                }
                                b'{' if in_data_array => {
                                    brace_count += 1;
                                    current_card.push(byte);
                                }
                                b'}' if in_data_array => {
                                    brace_count -= 1;
                                    current_card.push(byte);
                                    if brace_count == 0 && !current_card.is_empty() {
                                        // We have a complete card object
                                        match serde_json::from_slice::<Value>(&current_card) {
                                            Ok(card) => yield Ok(card),
                                            Err(e) => yield Err(anyhow::Error::from(e)),
                                        }
                                        current_card.clear();
                                    }
                                }
                                _ if in_data_array && brace_count > 0 => {
                                    current_card.push(byte);
                                }
                                b']' if in_data_array && brace_count == 0 => {
                                    // End of data array
                                    break;
                                }
                                _ => {} // Skip other characters
                            }
                            i += 1;
                        }
                        // Remove processed bytes, keep unprocessed ones
                        if i > 0 && i < buffer.len() {
                            buffer.drain(0..i);
                        } else if i >= buffer.len() {
                            buffer.clear();
                        }
                    }
                    Err(e) => yield Err(e),
                }
            }
        }
    }
}

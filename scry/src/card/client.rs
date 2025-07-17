use crate::shared::http_client::HttpClient;
use anyhow::Result;
use futures::Stream;
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

    /// Download AllPrintings.json then stream individual cards
    /// This approach is simpler and more reliable than streaming JSON parsing
    pub async fn fetch_all_cards_streaming(&self) -> Result<impl Stream<Item = Result<Value>>> {
        let url = format!("{}/AllPrintings.json", self.base_url);
        info!("Downloading AllPrintings.json (this may take several minutes)...");
        
        // Download the complete JSON with extended timeout
        let all_printings: Value = self.http_client.get_json(&url).await?;
        info!("AllPrintings.json downloaded successfully! Now streaming individual cards for processing...");
        
        Ok(self.extract_cards_stream(all_printings))
    }

    /// Extract individual cards from AllPrintings structure and stream them
    /// This replicates the TypeScript stream-json pipeline behavior
    fn extract_cards_stream(&self, all_printings: Value) -> impl Stream<Item = Result<Value>> {
        async_stream::stream! {
            // Navigate to data section (equivalent to pick({ filter: "data" }))
            if let Some(data) = all_printings.get("data") {
                if let Some(data_obj) = data.as_object() {
                    let total_sets = data_obj.len();
                    let mut processed_sets = 0;
                    
                    // Stream object key-value pairs (equivalent to streamObject())
                    for (set_code, set_object) in data_obj {
                        processed_sets += 1;
                        
                        // Extract cards from each set (equivalent to generator function)
                        if let Some(cards) = set_object.get("cards") {
                            if let Some(cards_array) = cards.as_array() {
                                info!("Processing {} cards from set: {} ({}/{} sets)", 
                                      cards_array.len(), set_code, processed_sets, total_sets);
                                
                                for card in cards_array {
                                    let mut card = card.clone();
                                    
                                    // Add set code if not present (matching TypeScript logic)
                                    if let Value::Object(ref mut map) = card {
                                        if !map.contains_key("setCode") {
                                            map.insert("setCode".to_string(), Value::String(set_code.clone()));
                                        }
                                    }
                                    
                                    yield Ok(card);
                                }
                            }
                        }
                        
                        // Yield control after each set to keep the runtime responsive
                        if processed_sets % 10 == 0 {
                            tokio::task::yield_now().await;
                        }
                    }
                } else {
                    yield Err(anyhow::anyhow!("Expected 'data' to be an object"));
                }
            } else {
                yield Err(anyhow::anyhow!("No 'data' field found in AllPrintings.json"));
            }
        }
    }
}

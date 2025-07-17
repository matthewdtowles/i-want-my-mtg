use crate::{
    card::{client::CardClient, mapper::CardMapper, repository::CardRepository},
    config::Config,
    database::ConnectionPool,
    shared::HttpClient,
};
use anyhow::Result;
use futures::StreamExt;
use std::sync::Arc;
use tracing::{info, warn};

pub struct CardIngestionService {
    client: CardClient,
    mapper: CardMapper,
    repository: CardRepository,
}

impl CardIngestionService {
    pub fn new(db: Arc<ConnectionPool>, http_client: HttpClient, config: &Config) -> Self {
        let base_url = Arc::from(config.mtg_json_base_url.clone());
        Self {
            client: CardClient::new(http_client, base_url),
            mapper: CardMapper::new(),
            repository: CardRepository::new(db),
        }
    }

    /// Ingests all cards for a specific set identified by `set_code`.
    ///
    /// Fetches card data from the client then maps and saves the cards
    /// Returns the number of cards ingested.
    pub async fn ingest_set_cards(&self, set_code: &str) -> Result<u64> {
        info!("Starting ingestion for set: {}", set_code);
        let raw_data = self.client.fetch_set_cards(set_code).await?;
        let cards = self.mapper.map_mtg_json_to_cards(raw_data)?;
        if cards.is_empty() {
            warn!("No cards found for set: {}", set_code);
            return Ok(0);
        }
        let count = self.repository.save(&cards).await?;
        info!("Successfully ingested {} cards for set {}", count, set_code);
        Ok(count)
    }

    /// Ingests all available cards using a streaming approach.
    ///
    /// Downloads AllPrintings.json first, then streams individual cards for processing
    /// Returns the total number of cards ingested
    pub async fn ingest_all_cards_streaming(&self) -> Result<u64> {
        info!("Starting streaming ingestion of ALL cards");
        let card_stream = self.client.fetch_all_cards_streaming().await?;
        let mut card_stream = Box::pin(card_stream);
        let mut total_count = 0;
        let mut batch = Vec::new();
        const BATCH_SIZE: usize = 500; // Increased batch size for better performance
        let mut processed_since_log = 0;
        const LOG_INTERVAL: usize = 1000; // Log every 1000 cards

        while let Some(card_result) = card_stream.next().await {
            match card_result {
                Ok(card_value) => {
                    match self.mapper.map_single_card(&card_value) {
                        Ok(card) => {
                            batch.push(card);
                            processed_since_log += 1;
                            // Save batch when it reaches the batch size
                            if batch.len() >= BATCH_SIZE {
                                match self.repository.save(&batch).await {
                                    Ok(count) => {
                                        total_count += count;
                                        batch.clear();
                                    }
                                    Err(e) => {
                                        warn!("Failed to save batch: {}", e);
                                        // Clear the problematic batch and continue
                                        batch.clear();
                                    }
                                }
                            }

                            // Log progress periodically
                            if processed_since_log >= LOG_INTERVAL {
                                info!("Processed {} cards so far", total_count + batch.len() as u64);
                                processed_since_log = 0;

                                // Yield control to keep the runtime responsive
                                tokio::task::yield_now().await;
                            }
                        }
                        Err(e) => {
                            warn!("Failed to map card: {}", e);
                            // Continue processing other cards
                        }
                    }
                }
                Err(e) => {
                    warn!("Failed to parse card JSON: {}", e);
                    // Continue streaming - don't fail the entire process for individual card errors
                }
            }
        }
        // Process any remaining cards in the final batch
        if !batch.is_empty() {
            match self.repository.save(&batch).await {
                Ok(count) => total_count += count,
                Err(e) => warn!("Failed to save final batch: {}", e),
            }
        }

        info!("Completed streaming ingestion: {} total cards", total_count);
        Ok(total_count)
    }
}

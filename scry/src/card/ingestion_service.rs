use crate::card::{client::CardClient, mapper::CardMapper, repository::CardRepository};
use anyhow::Result;
use futures::StreamExt;
use tracing::{info, warn};

pub struct CardIngestionService {
    client: CardClient,
    mapper: CardMapper,
    repository: CardRepository,
}

// TODO: analyze each method below and also re-impl ingest_set_cards and use non-streaming 
impl CardIngestionService {
    pub fn new(
        client: CardClient,
        mapper: CardMapper,
        repository: CardRepository,
    ) -> Self {
        Self {
            client,
            mapper,
            repository,
        }
    }

    // Ingest one set at a time (current approach)
    pub async fn ingest_set_cards(&self, set_code: &str) -> Result<u64> {
        info!("Starting card ingestion for set: {}", set_code);
        let mut card_stream = self.client.fetch_set_cards(set_code).await?;
        let mut total_count = 0;
        let mut batch = Vec::new();
        const BATCH_SIZE: usize = 1000;
        while let Some(card_result) = card_stream.next().await {
            match card_result {
                Ok(card_value) => match self.mapper.map_single_card(&card_value) {
                    Ok(card) => {
                        batch.push(card);
                        if batch.len() >= BATCH_SIZE {
                            self.repository.save(&batch).await?;
                            total_count += batch.len() as u64;
                            batch.clear();
                            info!("Processed {} cards so far for set {}", total_count, set_code);
                        }
                    }
                    Err(e) => warn!("Failed to map card: {}", e),
                },
                Err(e) => warn!("Failed to parse card JSON: {}", e),
            }
        }
        // Process remaining batch
        if !batch.is_empty() {
            self.repository.save(&batch).await?;
            total_count += batch.len() as u64;
        }
        info!("Completed ingestion for set {}: {} cards", set_code, total_count);
        Ok(total_count)
    }

    // Ingest all cards using streaming (more efficient)
    pub async fn ingest_all_cards_streaming(&self) -> Result<u64> {
        info!("Starting streaming ingestion of ALL cards");
        let card_stream = self.client.fetch_all_cards_streaming().await?;
        let mut card_stream = Box::pin(card_stream);
        let mut total_count = 0;
        let mut batch = Vec::new();
        // TODO: configurable?
        const BATCH_SIZE: usize = 5000;
        while let Some(card_result) = card_stream.next().await {
            match card_result {
                Ok(card_value) => match self.mapper.map_single_card(&card_value) {
                    Ok(card) => {
                        batch.push(card);
                        if batch.len() >= BATCH_SIZE {
                            self.repository.save(&batch).await?;
                            total_count += batch.len() as u64;
                            batch.clear();
                            info!("Processed {} cards so far", total_count);
                        }
                    }
                    Err(e) => warn!("Failed to map card: {}", e),
                },
                Err(e) => warn!("Failed to parse card JSON: {}", e),
            }
        }
        // Process remaining batch
        if !batch.is_empty() {
            self.repository.save(&batch).await?;
            total_count += batch.len() as u64;
        }
        info!("Completed streaming ingestion: {} total cards", total_count);
        Ok(total_count)
    }
}

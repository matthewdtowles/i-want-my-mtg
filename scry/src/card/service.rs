use crate::{
    card::{event_processor::CardEventProcessor, mapper::CardMapper, repository::CardRepository},
    database::ConnectionPool,
    utils::{HttpClient, JsonStreamParser},
};
use anyhow::Result;
use std::sync::Arc;
use tracing::{debug, info, warn};

pub struct CardService {
    client: Arc<HttpClient>,
    repository: CardRepository,
}

impl CardService {
    const BATCH_SIZE: usize = 500;

    pub fn new(db: Arc<ConnectionPool>, http_client: Arc<HttpClient>) -> Self {
        Self {
            client: http_client,
            repository: CardRepository::new(db),
        }
    }

    pub async fn fetch_count(&self) -> Result<u64> {
        self.repository.count().await
    }

    pub async fn fetch_legality_count(&self) -> Result<u64> {
        self.repository.legality_count().await
    }

    pub async fn ingest_set_cards(&self, set_code: &str) -> Result<u64> {
        info!("Starting card ingestion for set: {}", set_code);
        match self.repository.set_exists(set_code).await {
            Ok(false) => {
                warn!("Skipping card ingestion for set {}", set_code);
                return Ok(0);
            }
            Err(e) => {
                return Err(e);
            }
            Ok(true) => {}
        }
        let raw_data = self.client.fetch_set_cards(&set_code).await?;
        let cards = CardMapper::map_to_cards(raw_data)?;
        if cards.is_empty() {
            warn!("No cards found for set: {}", set_code);
            return Ok(0);
        }
        let count = self.repository.save_cards(&cards).await?;
        let _ = self.repository.save_legalities(&cards).await?;
        info!("Successfully ingested {} cards for set {}", count, set_code);
        Ok(count)
    }

    pub async fn ingest_all(&self) -> Result<()> {
        debug!("Start ingestion of all cards");
        let byte_stream = self.client.all_cards_stream().await?;
        debug!("Received byte stream for all cards");
        let event_processor = CardEventProcessor::new(Self::BATCH_SIZE);
        let mut json_stream_parser = JsonStreamParser::new(event_processor);
        let repo = self.repository.clone();
        json_stream_parser
            .parse_stream(byte_stream, move |batch| {
                let repo = repo.clone();
                Box::pin(async move {
                    if batch.is_empty() {
                        return Ok(());
                    }
                    let set_code = &batch[0].set_code;
                    match repo.set_exists(set_code).await {
                        Ok(false) => {
                            warn!("Skipping cards for missing set {}", set_code);
                            return Ok(());
                        }
                        Err(e) => {
                            return Err(e);
                        }
                        Ok(true) => {}
                    }
                    repo.save_cards(&batch).await?;
                    repo.save_legalities(&batch).await?;
                    Ok(())
                })
            })
            .await?;
        Ok(())
    }

    pub async fn delete_all(&self) -> Result<u64> {
        info!("Deleting all prices.");
        self.repository.delete_all().await
    }
}

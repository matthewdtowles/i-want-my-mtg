use crate::{
    card::{mapper::CardMapper, repository::CardRepository, stream_parser::CardStreamParser},
    database::ConnectionPool,
    utils::HttpClient,
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
        info!("Starting ingestion for set: {}", set_code);
        let raw_data = self.client.fetch_set_cards(&set_code).await?;
        let cards = CardMapper::map_to_cards(raw_data)?;
        if cards.is_empty() {
            warn!("No cards found for set: {}", set_code);
            return Ok(0);
        }
        let count = self.repository.save(&cards).await?;
        info!("Successfully ingested {} cards for set {}", count, set_code);
        Ok(count)
    }

    pub async fn ingest_all(&self) -> Result<()> {
        debug!("Start ingestion of all cards");
        let byte_stream = self.client.all_cards_stream().await?;
        debug!("Received byte stream for all cards");
        let mut stream_parser = CardStreamParser::new(Self::BATCH_SIZE);
        stream_parser
            .parse_stream(byte_stream, |batch| {
                let repo = &self.repository;
                Box::pin(async move {
                    repo.save(&batch).await?;
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

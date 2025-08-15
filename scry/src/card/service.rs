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

    /// Ingests all cards for a specific set identified by `set_code`.
    pub async fn ingest_set_cards(&self, set_code: &str) -> Result<u64> {
        info!("Starting ingestion for set: {}", set_code);
        let url_path = format!("{set_code}.json");
        let raw_data = self.client.get_json(&url_path).await?;
        let cards = CardMapper::map_to_cards(raw_data)?;
        if cards.is_empty() {
            warn!("No cards found for set: {}", set_code);
            return Ok(0);
        }
        let count = self.repository.save(&cards).await?;
        info!("Successfully ingested {} cards for set {}", count, set_code);
        Ok(count)
    }

    /// Ingests all available cards using a streaming approach.
    pub async fn ingest_all(&self) -> Result<()> {
        let url_path = "AllPrintings.json";
        debug!("Start ingestion of all cards");
        let byte_stream = self.client.get_bytes_stream(url_path).await?;
        debug!("Received byte stream for {}", url_path);
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

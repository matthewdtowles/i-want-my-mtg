use crate::card::{client::CardClient, mapper::CardMapper, repository::CardRepository};
use crate::{config::Config, database::ConnectionPool, shared::HttpClient};
use anyhow::Result;
use std::sync::Arc;
use tracing::{info, warn};

pub struct CardIngestionService {
    client: CardClient,
    mapper: CardMapper,
    repository: CardRepository,
}

impl CardIngestionService {
    pub fn new(
        connection_pool: Arc<ConnectionPool>,
        http_client: HttpClient,
        config: &Config,
    ) -> Self {
        Self {
            client: CardClient::new(http_client, config.mtg_json_base_url.clone()),
            mapper: CardMapper::new(),
            repository: CardRepository::new(connection_pool),
        }
    }

    pub async fn ingest_set(&self, set_code: &str) -> Result<u64> {
        info!("Starting card ingestion for set: {}", set_code);

        // Check if already exists
        let existing_count = self.repository.count_for_set(set_code).await?;
        if existing_count > 0 {
            info!(
                "Set {} already has {} cards. Skipping...",
                set_code, existing_count
            );
            return Ok(0);
        }

        // Fetch -> Map -> Store (single responsibility chain)
        let raw_data = self.client.fetch_set_cards(set_code).await?;
        let cards = self.mapper.map_mtg_json_to_cards(raw_data)?;

        if cards.is_empty() {
            warn!("No cards found for set: {}", set_code);
            return Ok(0);
        }

        let count = self.repository.bulk_insert(&cards).await?;
        info!("Successfully ingested {} cards for set {}", count, set_code);
        Ok(count)
    }

    pub async fn ingest_all(&self) -> Result<u64> {
        info!("Starting full card ingestion");

        let existing_count = self.repository.count().await?;
        if existing_count > 0 {
            info!("Database already has {} cards. Skipping...", existing_count);
            return Ok(0);
        }

        let raw_data = self.client.fetch_all_cards().await?;
        let cards = self.mapper.map_mtg_json_all_to_cards(raw_data)?;

        if cards.is_empty() {
            warn!("No cards found");
            return Ok(0);
        }

        let count = self.repository.bulk_insert(&cards).await?;
        info!("Successfully ingested {} total cards", count);
        Ok(count)
    }
}

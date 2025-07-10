use crate::clients::MtgJsonClient;
use crate::database::repositories::{CardRepository, PriceRepository};
use crate::models::{Card, Price};
use anyhow::Result;
use tracing::{info, warn};

pub struct IngestionService {
    api_client: MtgJsonClient,
    price_repo: PriceRepository,
    card_repo: CardRepository,
}

impl IngestionService {
    pub fn new(
        api_client: MtgJsonClient,
        price_repo: PriceRepository,
        card_repo: CardRepository,
    ) -> Self {
        Self {
            api_client,
            price_repo,
            card_repo,
        }
    }

    pub async fn ingest_cards_for_set(&self, set_code: &str, force: bool) -> Result<u64> {
        info!("Starting card ingestion for set: {}", set_code);

        if !force {
            let existing_count = self.card_repo.count_for_set(set_code).await?;
            if existing_count > 0 {
                info!(
                    "Set {} already has {} cards. Use --force to re-ingest",
                    set_code, existing_count
                );
                return Ok(0);
            }
        }

        let cards_data = self.api_client.fetch_set(set_code).await?;
        let cards = self.transform_cards_data(cards_data)?;

        if cards.is_empty() {
            warn!("No cards found for set: {}", set_code);
            return Ok(0);
        }

        let count = self.card_repo.bulk_insert(&cards).await?;
        info!("Successfully ingested {} cards for set {}", count, set_code);
        Ok(count)
    }

    pub async fn ingest_all_cards(&self, force: bool) -> Result<u64> {
        info!("Starting full card ingestion");

        if !force {
            let existing_count = self.card_repo.count().await?;
            if existing_count > 0 {
                info!(
                    "Database already has {} cards. Use --force to re-ingest",
                    existing_count
                );
                return Ok(0);
            }
        }

        // TODO: Implement fetch_all_cards in MtgJsonClient
        let cards_data = self.api_client.fetch_sets().await?; // Placeholder
        let cards = self.transform_cards_data(cards_data)?;

        if cards.is_empty() {
            warn!("No cards found");
            return Ok(0);
        }

        let count = self.card_repo.bulk_insert(&cards).await?;
        info!("Successfully ingested {} total cards", count);
        Ok(count)
    }

    pub async fn ingest_sets(&self, force: bool) -> Result<u64> {
        info!("Starting set list ingestion");

        let sets_data = self.api_client.fetch_sets().await?;
        let sets = self.transform_sets_data(sets_data)?;

        if sets.is_empty() {
            warn!("No sets found");
            return Ok(0);
        }

        // TODO: Create SetRepository and Set model
        let count = sets.len() as u64;
        info!("Successfully ingested {} sets", count);
        Ok(count)
    }

    pub async fn ingest_prices(&self, source: &str) -> Result<u64> {
        info!("Starting price ingestion from source: {}", source);

        let prices_data = self.api_client.fetch_prices().await?;
        let prices = self.transform_prices_data(prices_data)?;

        if prices.is_empty() {
            warn!("No prices found from source: {}", source);
            return Ok(0);
        }

        let count = self.price_repo.bulk_insert(&prices).await?;
        info!("Successfully ingested {} prices from {}", count, source);
        Ok(count)
    }

    fn transform_cards_data(&self, data: Vec<serde_json::Value>) -> Result<Vec<Card>> {
        // TODO: Implement transformation from MTG JSON format
        todo!("Implement card transformation")
    }

    fn transform_prices_data(&self, data: Vec<serde_json::Value>) -> Result<Vec<Price>> {
        // TODO: Implement transformation from MTG JSON format
        todo!("Implement price transformation")
    }

    fn transform_sets_data(&self, data: Vec<serde_json::Value>) -> Result<Vec<serde_json::Value>> {
        // TODO: Implement transformation from MTG JSON format and create Set model
        Ok(data)
    }
}

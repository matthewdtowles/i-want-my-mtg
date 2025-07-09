// src/services/ingestion.rs
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

impl<'db> IngestionService {
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

    pub async fn ingest_prices(&self, source: Option<String>) -> Result<u64> {
        info!(
            "Starting price ingestion from source: {:?}",
            source.as_deref().unwrap_or("scryfall")
        );

        let prices_data = self
            .api_client
            .fetch_scryfall::<Vec<serde_json::Value>>("cards")
            .await?;

        let prices: Vec<Price> = prices_data
            .into_iter()
            .filter_map(|data| self.transform_to_price(data).ok())
            .collect();

        if prices.is_empty() {
            warn!("No prices to ingest");
            return Ok(0);
        }

        let inserted_count = self.price_repo.bulk_insert(&prices).await?;
        info!("Successfully ingested {} prices", inserted_count);

        Ok(inserted_count)
    }

    pub async fn ingest_cards(&self, set_code: Option<String>, force: bool) -> Result<u64> {
        info!(
            "Starting card ingestion for set: {:?}, force: {}",
            set_code, force
        );

        let endpoint = match set_code {
            Some(set) => format!("cards/search?q=set:{}", set),
            None => "cards".to_string(),
        };

        let cards_data = self
            .api_client
            .fetch_scryfall::<Vec<serde_json::Value>>(&endpoint)
            .await?;

        let cards: Vec<Card> = cards_data
            .into_iter()
            .filter_map(|data| self.transform_to_card(data).ok())
            .collect();

        if cards.is_empty() {
            warn!("No cards to ingest");
            return Ok(0);
        }

        let inserted_count = self.card_repo.bulk_insert(&cards).await?;
        info!("Successfully ingested {} cards", inserted_count);

        Ok(inserted_count)
    }

    fn transform_to_price(&self, data: serde_json::Value) -> Result<Price> {
        // Transform API response to Price model
        todo!("Implement price transformation")
    }

    fn transform_to_card(&self, data: serde_json::Value) -> Result<Card> {
        // Transform API response to Card model
        todo!("Implement card transformation")
    }
}

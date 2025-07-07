// src/api/scry_api.rs
use anyhow::Result;
use crate::services::{IngestionService, PriceArchiver};
use crate::database::repositories::{price::PriceRepository, card::CardRepository};

pub struct ScryApi {
    ingestion_service: IngestionService,
    price_archiver: PriceArchiver,
    price_repo: PriceRepository,
    card_repo: CardRepository,
}

impl ScryApi {
    pub fn new(
        ingestion_service: IngestionService,
        price_archiver: PriceArchiver,
        price_repo: PriceRepository,
        card_repo: CardRepository,
    ) -> Self {
        Self {
            ingestion_service,
            price_archiver,
            price_repo,
            card_repo,
        }
    }

    pub async fn ingest_cards(&self, set_code: Option<String>, force: bool) -> Result<u64> {
        self.ingestion_service.ingest_cards(set_code, force).await
    }

    pub async fn ingest_prices(&self, source: Option<String>) -> Result<u64> {
        self.ingestion_service.ingest_prices(source).await
    }

    pub async fn archive_prices(&self, batch_size: i16) -> Result<u64> {
        self.price_archiver.archive(batch_size).await
    }

    pub async fn get_health_status(&self) -> Result<HealthStatus> {
        let card_count = self.card_repo.count().await?;
        let price_count = self.price_repo.count().await?;
        
        Ok(HealthStatus {
            card_count,
            price_count,
        })
    }
}

#[derive(Debug)]
pub struct HealthStatus {
    pub card_count: i64,
    pub price_count: i64,
}
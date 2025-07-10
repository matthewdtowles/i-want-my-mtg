use crate::cli::Commands;
use crate::database::repositories::{CardRepository, PriceRepository};
use crate::services::{IngestionService, PriceArchiver};
use anyhow::Result;
use tracing::{info, warn};

pub struct CliController {
    ingestion_service: IngestionService,
    price_archiver: PriceArchiver,
    price_repo: PriceRepository,
    card_repo: CardRepository,
}

impl CliController {
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

    pub async fn handle_command(&self, command: Commands) -> Result<()> {
        match command {
            Commands::Cards { set_code, force } => {
                self.handle_cards_ingestion(set_code, force).await
            }
            Commands::Sets { force } => self.handle_sets_ingestion(force).await,
            Commands::Prices {
                source,
                archive_batch_size,
            } => {
                self.handle_prices_ingestion(source, archive_batch_size)
                    .await
            }
            Commands::Health { detailed } => self.handle_health_check(detailed).await,
        }
    }

    async fn handle_cards_ingestion(&self, set_code: String) -> Result<()> {
        info!("Ingesting cards for set: {}", set);
        let count = self
            .ingestion_service
            .ingest_cards_for_set(&set, force)
            .await?;
        info!("Successfully ingested {} cards for set {}", count, set);
        Ok(())
    }

    async fn handle_sets_ingestion(&self) -> Result<()> {
        info!("Ingesting MTG set list");
        let count = self.ingestion_service.ingest_sets().await?;
        info!("Successfully ingested {} sets", count);
        Ok(())
    }

    async fn handle_prices_ingestion(&self) -> Result<()> {
        let source = source.unwrap_or_else(|| "mtgjson".to_string());
        let batch_size = archive_batch_size.unwrap_or(1000);
        info!("Starting price ingestion workflow");

        // Step 1: Archive old prices first
        info!("Archiving old prices before ingesting new data...");
        let archived_count = self.price_archiver.archive(batch_size).await?;

        if archived_count > 0 {
            info!("Archived {} old price records", archived_count);
        } else {
            info!("No old prices to archive");
        }

        // Step 2: Ingest today's prices
        info!("Ingesting today's prices from source: {}", source);
        let ingested_count = self.ingestion_service.ingest_prices(&source).await?;
        info!("Successfully ingested {} price records", ingested_count);

        info!(
            "Price ingestion workflow complete: {} archived, {} ingested",
            archived_count, ingested_count
        );
        Ok(())
    }

    async fn handle_health_check(&self, detailed: bool) -> Result<()> {
        info!("Performing system health check...");

        let health_status = self.get_health_status().await?;

        info!("=== SYSTEM HEALTH REPORT ===");
        info!("Cards in database: {}", health_status.card_count);
        info!("Current prices: {}", health_status.price_count);
        info!(
            "Price history records: {}",
            health_status.price_history_count
        );
        info!("Sets in database: {}", health_status.set_count);

        if detailed {
            info!("=== DETAILED HEALTH CHECK ===");
            let detailed_status = self.get_detailed_health_status().await?;
            info!("Cards with prices: {}", detailed_status.cards_with_prices);
            info!(
                "Cards without prices: {}",
                detailed_status.cards_without_prices
            );
            info!(
                "Average prices per card: {:.2}",
                detailed_status.avg_prices_per_card
            );
            info!("Oldest price date: {:?}", detailed_status.oldest_price_date);
            info!("Newest price date: {:?}", detailed_status.newest_price_date);

            if detailed_status.cards_without_prices > 0 {
                warn!(
                    "{} cards are missing price data",
                    detailed_status.cards_without_prices
                );
            }
        }

        info!("=== END HEALTH REPORT ===");
        Ok(())
    }

    async fn get_health_status(&self) -> Result<HealthStatus> {
        let card_count = self.card_repo.count().await?;
        let price_count = self.price_repo.count().await?;
        let price_history_count = self.price_repo.count_history().await?;
        let set_count = self.card_repo.count_distinct_sets().await?;

        Ok(HealthStatus {
            card_count,
            price_count,
            price_history_count,
            set_count,
        })
    }

    async fn get_detailed_health_status(&self) -> Result<DetailedHealthStatus> {
        let cards_with_prices = self.price_repo.count_cards_with_prices().await?;
        let total_cards = self.card_repo.count().await?;
        let cards_without_prices = total_cards - cards_with_prices;

        let avg_prices_per_card = if total_cards > 0 {
            self.price_repo.count().await? as f64 / total_cards as f64
        } else {
            0.0
        };

        let (oldest_price_date, newest_price_date) = self.price_repo.get_price_date_range().await?;

        Ok(DetailedHealthStatus {
            cards_with_prices,
            cards_without_prices,
            avg_prices_per_card,
            oldest_price_date,
            newest_price_date,
        })
    }
}

#[derive(Debug)]
pub struct HealthStatus {
    pub card_count: i64,
    pub price_count: i64,
    pub price_history_count: i64,
    pub set_count: i64,
}

#[derive(Debug)]
pub struct DetailedHealthStatus {
    pub cards_with_prices: i64,
    pub cards_without_prices: i64,
    pub avg_prices_per_card: f64,
    pub oldest_price_date: Option<chrono::NaiveDate>,
    pub newest_price_date: Option<chrono::NaiveDate>,
}

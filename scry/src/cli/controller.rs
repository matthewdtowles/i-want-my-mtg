use crate::{
    card::CardIngestionService, cli::Commands, health_check::HealthCheckService,
    price::PriceArchivalService, price::PriceIngestionService, set::SetIngestionService,
};
use anyhow::Result;
use tracing::info;

pub struct CliController {
    card_ingestion_service: CardIngestionService,
    set_ingestion_service: SetIngestionService,
    price_ingestion_service: PriceIngestionService,
    price_archival_service: PriceArchivalService,
    health_service: HealthCheckService,
}

impl CliController {
    pub fn new(
        card_ingestion_service: CardIngestionService,
        set_ingestion_service: SetIngestionService,
        price_ingestion_service: PriceIngestionService,
        price_archival_service: PriceArchivalService,
        health_service: HealthCheckService,
    ) -> Self {
        Self {
            card_ingestion_service,
            set_ingestion_service,
            price_ingestion_service,
            price_archival_service,
            health_service,
        }
    }

    pub async fn handle_command(&self, command: Commands) -> Result<()> {
        match command {
            Commands::Cards { set_code } => {
                match set_code {
                    Some(set) => {
                        info!("Ingesting cards for set: {}", set);
                        let count = self.card_ingestion_service.ingest_set(&set).await?;
                        info!("Successfully ingested {} cards for set {}", count, set);
                    }
                    None => {
                        info!("Ingesting all cards");
                        let count = self.card_ingestion_service.ingest_all().await?;
                        info!("Successfully ingested {} total cards", count);
                    }
                }
                Ok(())
            }
            Commands::Sets => {
                info!("Ingesting MTG set list");
                let count = self.set_ingestion_service.ingest_all().await?;
                info!("Successfully ingested {} sets", count);
                Ok(())
            }
            Commands::Prices => {
                info!("Starting price workflow");

                // Archive old prices first
                let archived_count = self.price_archival_service.archive().await?;
                if archived_count > 0 {
                    info!("Archived {} old price records", archived_count);
                }

                // Ingest new prices
                let ingested_count = self.price_ingestion_service.ingest_from_source().await?;
                info!("Successfully ingested {} price records", ingested_count);

                Ok(())
            }
            Commands::Health { detailed } => {
                if detailed {
                    let status = self.health_service.detailed_check().await?;
                    status.display();
                } else {
                    let status = self.health_service.basic_check().await?;
                    status.display();
                }
                Ok(())
            }
        }
    }
}

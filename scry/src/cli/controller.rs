use crate::{
    card::CardService, cli::Commands, health_check::HealthCheckService, price::PriceService,
    set::SetService,
};
use anyhow::Result;
use dialoguer::Confirm;
use tracing::{info, warn};

pub struct CliController {
    card_service: CardService,
    set_service: SetService,
    price_service: PriceService,
    health_service: HealthCheckService,
}

impl CliController {
    pub fn new(
        card_service: CardService,
        set_service: SetService,
        price_service: PriceService,
        health_service: HealthCheckService,
    ) -> Self {
        Self {
            card_service,
            set_service,
            price_service,
            health_service,
        }
    }

    pub async fn handle_command(&self, command: Commands) -> Result<()> {
        match command {
            Commands::Ingest {
                sets,
                cards,
                prices,
                set_cards,
                reset,
            } => {
                if reset {
                    let confirmed = Confirm::new()
                        .with_prompt("This will DELETE all MTG data before ingesting. Do you want to proceed?")
                        .default(false)
                        .interact()
                        .unwrap();
                    if !confirmed {
                        println!("Aborted by user.");
                        return Ok(());
                    }
                    let prices_deleted = self.price_service.delete_all().await?;
                    let cards_deleted = self.card_service.delete_all().await?;
                    let sets_deleted = self.set_service.delete_all().await?;
                    info!(
                        "All MTG data deleted: {} sets | {} cards | {} prices",
                        sets_deleted, cards_deleted, prices_deleted
                    );
                }
                let do_all = !sets && !cards && !prices && set_cards.is_none();
                if do_all || sets {
                    let total_ingested = self.set_service.ingest_all().await?;
                    info!("{} sets ingested", total_ingested);
                }
                if do_all || cards {
                    let total_ingested = self.card_service.ingest_all().await?;
                    info!("{} cards ingested", total_ingested);
                }
                if !cards {
                    if let Some(set_code) = &set_cards {
                        let total_ingested = self.card_service.ingest_set_cards(set_code).await?;
                        info!("{} cards ingested for set '{}'.", total_ingested, set_code);
                    }
                }
                if do_all || prices {
                    let total_ingested = self.price_service.ingest_all_today().await?;
                    info!("{} prices ingested", total_ingested);
                    self.price_service.clean_up_prices().await?;
                    // log out dates in price table and price history table
                    let has_current_prices = self.price_service.prices_are_current().await?;
                    if has_current_prices {
                        info!("Price table is up to date.");
                    } else {
                        warn!("Prices for today's date not yet ingested");
                    }
                }

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

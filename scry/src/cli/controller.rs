use crate::{
    card::CardService, cli::Commands, health_check::HealthCheckService, price::PriceService,
    set::SetService,
};
use anyhow::Result;
use dialoguer::Confirm;
use tracing::{error, info, warn};

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
                if let Err(e) = self
                    .handle_ingest(sets, cards, prices, set_cards, reset)
                    .await
                {
                    error!("Ingestion failed: {}", e);
                }
                Ok(())
            }

            Commands::Cleanup {
                cards,
                sets,
                other_sides,
                online,
                set_code,
                batch_size,
            } => {
                if let Err(e) = self
                    .handle_cleanup(cards, sets, other_sides, online, set_code, batch_size)
                    .await
                {
                    error!("Cleanup failed: {}", e);
                }
                Ok(())
            }

            Commands::Health { detailed } => {
                if let Err(e) = self.handle_health(detailed).await {
                    error!("Health check failed: {}", e);
                }
                Ok(())
            }
        }
    }

    async fn handle_ingest(
        &self,
        sets: bool,
        cards: bool,
        prices: bool,
        set_cards: Option<String>,
        reset: bool,
    ) -> Result<()> {
        if reset {
            match self.reset_data().await {
                Ok(()) => info!("Successfully reset data."),
                Err(e) => error!("Failed to reset data: {}", e),
            }
        }
        let do_all = !sets && !cards && !prices && set_cards.is_none();
        if do_all || sets {
            match self.update_sets().await {
                Ok(()) => info!("Successfully updated sets."),
                Err(e) => error!("Failed to update sets: {}", e),
            }
        }
        if do_all || cards {
            match self.update_cards().await {
                Ok(()) => info!("Card update completed successfully."),
                Err(e) => error!("Card udpate failure: {}", e),
            }
        }
        if !cards {
            if let Some(set_code) = &set_cards {
                match self.card_service.ingest_set_cards(set_code).await {
                    Ok(ingested) => info!("{} cards for set code '{}'.", ingested, set_code),
                    Err(e) => error!("Error updating cards for set code '{}': {}", set_code, e),
                }
            }
        }
        if do_all || prices {
            match self.update_prices().await {
                Ok(()) => info!("Price update completed successfully."),
                Err(e) => error!("Price update failure: {}", e),
            }
        }
        Ok(())
    }

    async fn handle_cleanup(
        &self,
        cards: bool,
        sets: bool,
        other_sides: bool,
        online: bool,
        set_code: Option<String>,
        batch_size: i64,
    ) -> Result<()> {
        if !cards && !sets {
            return Ok(());
        }
        if cards {
            if let Some(code) = set_code.as_deref() {
                if other_sides {
                    let n = self
                        .card_service
                        .delete_other_sides_from_set(code, batch_size)
                        .await?;
                    info!("Deleted {} non-'a' faces for set {}", n, code);
                }
                if online {
                    let n = self
                        .card_service
                        .delete_online_cards_for_set(code, batch_size)
                        .await?;
                    info!("Deleted {} online-only cards for set {}", n, code);
                }
            } else {
                if other_sides {
                    let n = self
                        .card_service
                        .delete_other_side_cards(batch_size)
                        .await?;
                    info!("Deleted {} non-'a' faces across all sets", n);
                }
                if online {
                    let n = self.card_service.delete_online_cards(batch_size).await?;
                    info!("Deleted {} online-only cards across all sets", n);
                }
            }
        }
        if sets {
            if online {
                let n = self
                    .set_service
                    .cleanup_delete_online_sets(batch_size)
                    .await?;
                info!("Deleted {} online-only sets (and dependents)", n);
            } else {
                warn!("No set cleanup action selected. Use --online to remove online-only sets.");
            }
        }
        Ok(())
    }

    async fn handle_health(&self, detailed: bool) -> Result<()> {
        if detailed {
            let status = self.health_service.detailed_check().await?;
            status.display();
        } else {
            let status = self.health_service.basic_check().await?;
            status.display();
        }
        Ok(())
    }

    async fn update_prices(&self) -> Result<()> {
        let total_prices_before = self.price_service.fetch_price_count().await?;
        let total_history_before = self.price_service.fetch_price_history_count().await?;
        self.price_service.ingest_all_today().await?;
        self.price_service.clean_up_prices().await?;
        let total_prices_after = self.price_service.fetch_price_count().await?;
        let total_history_after = self.price_service.fetch_price_history_count().await?;
        info!("Total prices before: {}", total_prices_before);
        info!("Total prices after: {}", total_prices_after);
        info!("Total prices in history before: {}", total_history_before);
        info!("Total prices in history after: {}", total_history_after);
        let has_current_prices = self.price_service.prices_are_current().await?;
        if has_current_prices {
            info!("Price table is up to date.");
        } else {
            warn!("Prices for today's date not yet available.");
        }
        Ok(())
    }

    async fn update_sets(&self) -> Result<()> {
        let total_sets_before = self.set_service.fetch_count().await?;
        self.set_service.ingest_all().await?;
        let total_sets_after = self.set_service.fetch_count().await?;
        info!("Total sets before: {}", total_sets_before);
        info!("Total sets after: {}", total_sets_after);
        Ok(())
    }

    async fn update_cards(&self) -> Result<()> {
        let total_cards_before = self.card_service.fetch_count().await?;
        let total_legalities_before = self.card_service.fetch_legality_count().await?;
        self.card_service.ingest_all().await?;
        let total_cards_after = self.card_service.fetch_count().await?;
        let total_legalities_after = self.card_service.fetch_legality_count().await?;
        info!("Total cards before {}", total_cards_before);
        info!("Total cards after {}", total_cards_after);
        info!("Total legalities before {}", total_legalities_before);
        info!("Total legalities after {}", total_legalities_after);
        Ok(())
    }

    async fn reset_data(&self) -> Result<()> {
        let confirmed = Confirm::new()
            .with_prompt("This will DELETE all MTG data before ingesting. Do you want to proceed?")
            .default(false)
            .interact()
            .unwrap();
        if !confirmed {
            println!("Skipped data reset.");
            return Ok(());
        }
        let prices_deleted = self.price_service.delete_all().await?;
        let cards_deleted = self.card_service.delete_all().await?;
        let sets_deleted = self.set_service.delete_all().await?;
        info!(
            "All MTG data deleted: {} sets | {} cards | {} prices",
            sets_deleted, cards_deleted, prices_deleted
        );
        Ok(())
    }
}

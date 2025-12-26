use crate::{cli::Commands, price::PriceService};
use anyhow::Result;
use dialoguer::Confirm;
use std::sync::Arc;
use tracing::{error, info, warn};

pub struct CliController {
    card_service: crate::card::service::CardService,
    set_service: crate::set::service::SetService,
    price_service: Arc<PriceService>,
    health_service: crate::health_check::service::HealthCheckService,
}

impl CliController {
    pub fn new(
        card_service: crate::card::service::CardService,
        set_service: crate::set::service::SetService,
        price_service: Arc<PriceService>,
        health_service: crate::health_check::service::HealthCheckService,
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
                if let Err(e) = self.post_ingest_prune().await {
                    error!("Post ingestion pruning failed: {}", e);
                }
                if let Err(e) = self.post_ingest_updates().await {
                    error!("Post ingestion updates failed: {}", e);
                }
                Ok(())
            }

            Commands::Cleanup { cards, batch_size } => {
                if let Err(e) = self.handle_cleanup(cards, batch_size).await {
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

    async fn handle_cleanup(&self, cards: bool, batch_size: i64) -> Result<()> {
        info!("Handle cleanup called.");
        let total_sets_before = self.set_service.fetch_count().await?;
        let total_cards_before = self.card_service.fetch_count().await?;
        info!(
            "Set cleanup starting: before -> {} sets | {} cards",
            total_sets_before, total_cards_before
        );
        let total_sets_deleted = self.set_service.cleanup_sets(batch_size).await?;
        info!("Deleted {} total sets", total_sets_deleted);
        let total_sets_after = self.set_service.fetch_count().await?;
        let total_cards_after = self.card_service.fetch_count().await?;
        info!(
            "Set cleanup complete: after -> {} sets | {} cards",
            total_sets_after, total_cards_after
        );
        if cards {
            info!("Begin cleanup of individual cards.");
            let total_deleted = self.card_service.cleanup_cards(batch_size).await?;
            info!("Deleted {} total cards", total_deleted);
            let total_cards_after = self.card_service.fetch_count().await?;
            info!(
                "Card cleanup complete: after -> {} cards",
                total_cards_after
            );
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

    async fn post_ingest_prune(&self) -> Result<()> {
        info!("Begin post-ingestion pruning of sets and cards.");
        let total_sets_before = self.set_service.fetch_count().await?;
        let total_cards_before = self.card_service.fetch_count().await?;

        let cards_deleted = self.card_service.prune_foreign_unpriced().await?;
        info!("Pruned {} foreign cards without prices.", cards_deleted);

        let min_price_pct = 0.36;
        let sets_deleted = self.set_service.prune_missing_prices(min_price_pct).await?;
        info!("Pruned {} sets missing prices.", sets_deleted);

        let sets_deleted = self.set_service.prune_empty_sets().await?;
        info!("Pruned {} sets without any cards.", sets_deleted);

        let cards_deleted = self.card_service.prune_duplicate_foils().await?;
        info!("Pruned {} duplicate foil cards.", cards_deleted);

        let total_sets_after = self.set_service.fetch_count().await?;
        let total_cards_after = self.card_service.fetch_count().await?;
        info!(
            "Post-ingestion pruning complete. Total sets before {} | after {}",
            total_sets_before, total_sets_after
        );
        info!(
            "Total cards before {} | after {}",
            total_cards_before, total_cards_after
        );
        Ok(())
    }

    async fn post_ingest_updates(&self) -> Result<()> {
        info!("Begin post-ingestion updates.");
        let base_sizes = self.card_service.count_per_all_sets(true).await?;
        info!("Found {} base_sizes for all sets.", base_sizes.len());
        let total_sizes = self.card_service.count_per_all_sets(false).await?;
        info!("Found {} total_sizes for all sets.", total_sizes.len());
        let total_updated = self
            .set_service
            .update_sizes(base_sizes, total_sizes)
            .await?;
        info!("Total updated rows after updates: {}", total_updated);
        let total_set_prices_updated = self.set_service.update_set_prices().await?;
        info!("Total set prices updated: {}", total_set_prices_updated);
        Ok(())
    }
}

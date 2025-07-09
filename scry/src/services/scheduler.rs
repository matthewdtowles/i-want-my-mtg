use anyhow::Result;
use tokio_cron_scheduler::{Job, JobScheduler};
use tracing::{error, info};
use std::sync::Arc;

use crate::config::Config;
use crate::clients::MtgJsonClient;

pub struct Scheduler {
    scheduler: JobScheduler,
    request_client: Arc<MtgJsonClient>,
    config: Arc<Config>,
}

impl Scheduler {
    pub fn new(scheduler: JobScheduler, mtgjson_client: MtgJsonClient, config: Config) -> Self {
        Self {
            scheduler,
            request_client: Arc::new(mtgjson_client),
            config: Arc::new(config),
        }
    }

    pub async fn start_watching(&self) -> Result<()> {
        info!("Setting up watchers for data sources...");
        
        // Clone what we need for the async closure
        let mtgjson_client = Arc::clone(&self.request_client);
        let batch_size = self.config.archive_batch_size;
        
        // Archive old price visions daily at 2 AM
        let archive_job = Job::new_async("0 2 * * *", move |_uuid, _l| {
            let mtgjson_client = Arc::clone(&mtgjson_client);
            Box::pin(async move {
                info!("Starting nightly price archiving...");
                match mtgjson_client.archive_prices(batch_size).await {
                    Ok(count) => info!("Nightly archive complete: {} records processed", count),
                    Err(e) => error!("Archive failed: {}", e),
                }
            })
        })?;

        self.scheduler.add(archive_job).await?;
        self.scheduler.start().await?;
        
        // Keep the scheduler running
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        }
    }

    pub async fn ingest_cards(&self, set_code: Option<String>) -> Result<u64> {
        info!("Starting card ingestion for set: {:?}", set_code);
        self.request_client.ingest_cards(set_code).await
    }

    pub async fn ingest_prices(&self) -> Result<u64> {
        info!("Starting price ingestion");
        self.request_client.ingest_prices().await
    }

    pub async fn archive_prices(&self, custom_batch_size: Option<i16>) -> Result<u64> {
        info!("Starting manual price archiving...");
        let batch_size = custom_batch_size.unwrap_or(self.config.archive_batch_size);
        self.request_client.archive_prices(batch_size).await
    }

    pub async fn check_health(&self) -> Result<()> {
        info!("Checking system health...");

        let health_status = self.request_client.get_health_status().await?;

        info!("System health report:");
        info!("    Cards in database: {}", health_status.card_count);
        info!("    Current prices: {}", health_status.price_count);

        Ok(())
    }

    // Future: Add other scheduled jobs
    pub async fn add_price_ingestion_job(&self, cron_expression: &str) -> Result<()> {
        let mtgjson_client = Arc::clone(&self.request_client);
        let cron_expr = cron_expression.to_string();
        
        let price_job = Job::new_async(&cron_expr, move |_uuid, _l| {
            let mtgjson_client = Arc::clone(&mtgjson_client);
            Box::pin(async move {
                info!("Starting scheduled price ingestion...");
                match mtgjson_client.ingest_prices(None).await {
                    Ok(count) => info!("Price ingestion complete: {} records", count),
                    Err(e) => error!("Price ingestion failed: {}", e),
                }
            })
        })?;

        self.scheduler.add(price_job).await?;
        Ok(())
    }

    pub async fn add_card_ingestion_job(&self, cron_expression: &str) -> Result<()> {
        let mtgjson_client = Arc::clone(&self.request_client);
        let cron_expr = cron_expression.to_string();
        
        let card_job = Job::new_async(&cron_expr, move |_uuid, _l| {
            let mtgjson_client = Arc::clone(&mtgjson_client);
            Box::pin(async move {
                info!("Starting scheduled card ingestion...");
                match mtgjson_client.ingest_cards(None, false).await {
                    Ok(count) => info!("Card ingestion complete: {} records", count),
                    Err(e) => error!("Card ingestion failed: {}", e),
                }
            })
        })?;

        self.scheduler.add(card_job).await?;
        Ok(())
    }
}

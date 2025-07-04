use anyhow::Result;
use tokio_cron_scheduler::{Job, JobScheduler};
use tracing::{error, info};

use crate::config::Config;
use crate::database::create_pool;
use crate::jobs::price_archiver::PriceArchiver;

pub struct Scheduler {
    scheduler: JobScheduler,
    price_archiver: PriceArchiver,
}

impl Scheduler {
    pub async fn new(config: Config) -> Result<Self> {
        let pool = create_pool(&config).await?;
        let scheduler = JobScheduler::new().await?;
        let price_archiver = PriceArchiver::new(pool, config);

        Ok(Self {
            scheduler,
            price_archiver,
        })
    }

    pub async fn start_watching(&self) -> Result<()> {
        info!("Setting up watchers for data sources...");

        /// Archive old price visions daily at 2 AM
        let price_archiver = self.price_archiver.clone();
        /// TODO: parameterize the cron expression via config
        let archive_job = Job::new_async("0 2 * * *", move |_uuid, _l| {
            let archiver = price_archiver.clone();
            Box::pin(async move {
                info!("Starting nightly price archiving ritual...");
                match archiver.archive_old_visions().await {
                    Ok(stats) => info!("Nightly archive complete: {:?}", stats),
                    Err(e) => error!("Archive ritual failed: {}", e),
                }
            })
        })?;

        self.scheduler.add(archive_job).await?;
        self.scheduler.start().await?;
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        }
    }

    pub async fn scry_cards(&self, _set_code: Option<String>, _force: bool) -> Result<()> {
        info!("[TODO] Ingesting card data...");
        // TODO: Implement card data ingestion
        Ok(())
    }

    pub async fn scry_prices(&self, _source: Option<String>) -> Result<()> {
        info!("[TODO] Ingesting price data...");
        // TODO: Implement price updates
        Ok(())
    }

    pub async fn archive_old_visions(&self, days: u32) -> Result<()> {
        // Temporarily override retention for manual run
        let mut config = self.price_archiver.config.clone();
        config.price_retention_days = days as i64;

        let temp_archiver = PriceArchiver::new(self.price_archiver.pool.clone(), config);
        temp_archiver.archive_old_visions().await?;
        Ok(())
    }

    pub async fn scry_sets(&self) -> Result<()> {
        info!("[TODO] Scrying set releases...");
        // TODO: Implement set data ingestion
        Ok(())
    }

    pub async fn check_clarity(&self) -> Result<()> {
        info!("Checking data clarity...");

        // Basic health checks
        let card_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM cards")
            .fetch_one(&self.price_archiver.pool)
            .await?;

        let price_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM prices")
            .fetch_one(&self.price_archiver.pool)
            .await?;

        info!("Data clarity report:");
        info!("    Cards in sight: {}", card_count.0);
        info!("    Current prices: {}", price_count.0);

        Ok(())
    }
}

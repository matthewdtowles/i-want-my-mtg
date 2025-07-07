use anyhow::Result;
use clap::{Parser, Subcommand};
use tokio_cron_scheduler::JobScheduler;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod config;
mod database;
mod models;
mod services;

use config::Config;
use services::scheduler::Scheduler;

#[derive(Parser)]
#[command(name = "scry")]
#[command(about = "Scry data sources for MTG collection insights")]
#[command(version)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Start watching data sources (scheduled operations)
    Watch,

    /// Ingest card data
    Cards {
        #[arg(short, long, help = "Specific set code to scry")]
        set_code: Option<String>,
        #[arg(long, help = "Force full resync")]
        force: bool,
    },

    /// Ingest pricing data
    Prices {
        #[arg(short, long, help = "Specific source: scryfall, tcgplayer")]
        source: Option<String>,
    },

    /// Archive old prices to history tables
    Archive {
        #[arg(short, long, help = "Batch size for archiving")]
        batch_size: Option<i16>,
    },

    /// Ingest set data
    Sets,

    /// Check the clarity of our data (health check)
    Clarity,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "scry=info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    dotenvy::dotenv().ok();

    let cli = Cli::parse();
    let config = Config::from_env()?;
    info!("Scry awakens...");

    // Create database service (single connection pool)
    let db = database::DatabaseService::new(&config).await?;

    // Create repositories with borrowed DatabaseService
    let price_repo = database::repositories::PriceRepository::new(&db);
    let card_repo = database::repositories::CardRepository::new(&db);

    // Create ScryApi (was ApiClient)
    let scry_api = api::ScryApi::new(&config);

    // Create services with borrowed repositories
    let ingestion_service = services::IngestionService::new(scry_api, price_repo, card_repo);
    let price_archiver = services::PriceArchiver::new(price_repo);

    // Create main API controller
    let api_controller =
        api::ScryApi::new(ingestion_service, price_archiver, price_repo, card_repo);

    // Create scheduler
    let job_scheduler = JobScheduler::new().await?;
    let scheduler = Scheduler::new(job_scheduler, api_controller, config);

    match cli.command {
        Commands::Watch => {
            info!("Starting to watch data sources...");
            scheduler.start_watching().await?;
        }
        Commands::Cards { set_code, force } => {
            info!("Scrying card data...");
            let count = scheduler.ingest_cards(set_code, force).await?;
            info!("Ingested {} cards", count);
        }
        Commands::Prices { source } => {
            info!("Scrying price data...");
            let count = scheduler.ingest_prices(source).await?;
            info!("Ingested {} prices", count);
        }
        Commands::Archive { batch_size } => {
            info!("Archiving old visions...");
            let count = scheduler.archive_prices(batch_size).await?;
            info!("Archived {} price records", count);
        }
        Commands::Sets => {
            info!("Scrying for new set releases...");
            // TODO: Add sets functionality
            info!("Sets functionality not implemented yet");
        }
        Commands::Clarity => {
            info!("Checking data clarity...");
            scheduler.check_health().await?;
        }
    }

    info!("Scry's vision is complete");
    Ok(())
}

use clap::{Parser, Subcommand};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod database;
mod jobs;
mod models;

use config::Config;
use jobs::scheduler::Scheduler;

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
        #[arg(short, long, default_value = "7", help = "Days to keep in main tables")]
        days: u32,
    },

    /// Ingest set data
    Sets,

    /// Check the clarity of our data (health check)
    Clarity,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
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

    match cli.command {
        Commands::Watch => {
            info!("Starting to watch data sources...");
            let scheduler = Scheduler::new(config).await?;
            scheduler.start_watching().await?;
        }
        Commands::Cards { set_code, force } => {
            info!("Scrying card data...");
            let scheduler = Scheduler::new(config).await?;
            scheduler.scry_cards(set_code, force).await?;
        }
        Commands::Prices { source } => {
            info!("Scrying price data...");
            let scheduler = Scheduler::new(config).await?;
            scheduler.scry_prices(source).await?;
        }
        Commands::Archive { days } => {
            info!("Archiving old visions ({} day retention)...", days);
            let scheduler = Scheduler::new(config).await?;
            scheduler.archive_old_visions(days).await?;
        }
        Commands::Sets => {
            info!("Scrying for new set releases...");
            let scheduler = Scheduler::new(config).await?;
            scheduler.scry_sets().await?;
        }
        Commands::Clarity => {
            info!("Checking data clarity...");
            let scheduler = Scheduler::new(config).await?;
            scheduler.check_clarity().await?;
        }
    }

    info!("Scry's vision is complete");
    Ok(())
}

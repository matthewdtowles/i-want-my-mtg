use anyhow::Result;
use clap::Parser;
use cli::{commands::Cli, CliController};
use config::Config;
use std::sync::Arc;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod cli;
mod clients;
mod config;
mod database;
mod models;
mod services;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "scry=info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load environment and config
    dotenvy::dotenv().ok();
    let cli = Cli::parse();
    let config = Config::from_env()?;

    info!("🔮 Scry: MTG Data Management Tool");

    // Initialize dependencies
    let dependencies = initialize_dependencies(&config).await?;

    // Create CLI controller and handle command
    let cli_controller = CliController::new(
        dependencies.ingestion_service,
        dependencies.price_archiver,
        dependencies.price_repo,
        dependencies.card_repo,
    );

    // Execute the command
    cli_controller.handle_command(cli.command).await?;

    info!("✅ Scry completed successfully");
    Ok(())
}

async fn initialize_dependencies(config: &Config) -> Result<Dependencies> {
    info!("Initializing system dependencies...");

    // Create database service
    let db = Arc::new(database::DatabaseService::new(config).await?);

    // Create repositories
    let price_repo = database::repositories::PriceRepository::new(Arc::clone(&db));
    let card_repo = database::repositories::CardRepository::new(Arc::clone(&db));

    // Create external API client
    let mtg_client = clients::MtgJsonClient::new(config);

    // Create services
    let ingestion_service =
        services::IngestionService::new(mtg_client, price_repo.clone(), card_repo.clone());
    let price_archiver = services::PriceArchiver::new(price_repo.clone());

    info!("System dependencies initialized successfully");

    Ok(Dependencies {
        ingestion_service,
        price_archiver,
        price_repo,
        card_repo,
    })
}

struct Dependencies {
    ingestion_service: services::IngestionService,
    price_archiver: services::PriceArchiver,
    price_repo: database::repositories::PriceRepository,
    card_repo: database::repositories::CardRepository,
}

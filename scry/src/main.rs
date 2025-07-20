use anyhow::Result;
use clap::Parser;
use cli::{commands::Cli, controller::CliController};
use config::Config;
use shared::HttpClient;
use std::sync::Arc;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod card;
mod cli;
mod config;
mod database;
mod health_check;
mod price;
mod set;
mod shared;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "scry=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    dotenvy::dotenv().ok();
    let cli = Cli::parse();
    let config = Config::from_env()?;

    info!("🔮 Scry - MTG Data Management Tool");

    // Initialize minimal shared dependencies
    let connection_pool = Arc::new(database::ConnectionPool::new(&config).await?);
    // TODO: make Arc clone of HttpClient for each service?
    let http_client = HttpClient::new();

    // Create CLI controller with feature services
    let cli_controller = CliController::new(
        card::ingestion_service::CardIngestionService::new(
            connection_pool.clone(),
            http_client.clone()
        ),
        set::ingestion_service::SetIngestionService::new(
            connection_pool.clone(),
            http_client.clone(),
            &config,
        ),
        price::ingestion_service::PriceIngestionService::new(
            connection_pool.clone(),
            http_client.clone(),
            &config,
        ),
        price::archival_service::PriceArchivalService::new(
            connection_pool.clone(),
            config.archive_batch_size as i16,
        ),
        health_check::service::HealthCheckService::new(connection_pool),
    );

    cli_controller.handle_command(cli.command).await?;
    info!("✨ Scry complete.");
    Ok(())
}

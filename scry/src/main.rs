use anyhow::Result;
use clap::Parser;
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

use cli::{commands::Cli, controller::CliController};
use config::Config;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "scry=info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    dotenvy::dotenv().ok();
    let cli = Cli::parse();
    let config = Config::from_env()?;

    info!("🔮 Scry: MTG Data Management Tool");

    // Initialize minimal shared dependencies
    let connection_pool = Arc::new(database::ConnectionPool::new(&config).await?);
    let http_client = shared::http_client::HttpClient::new(&config);

    // Create CLI controller with feature services
    let cli_controller = CliController::new(
        card::service::CardIngestionService::new(
            connection_pool.clone(),
            http_client.clone(),
            &config,
        ),
        set::service::SetIngestionService::new(
            connection_pool.clone(),
            http_client.clone(),
            &config,
        ),
        price::ingestion_service::PriceIngestionService::new(
            connection_pool.clone(),
            http_client.clone(),
            &config,
        ),
        price::archival_service::PriceArchivalService::new(connection_pool.clone()),
        health_check::service::HealthCheckService::new(connection_pool),
    );

    cli_controller.handle_command(cli.command).await?;
    info!("✨ Scry's vision is complete");
    Ok(())
}

use anyhow::Result;
use clap::Parser;
use cli::{commands::Cli, controller::CliController};
use config::Config;
use std::sync::Arc;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utils::HttpClient;

mod card;
mod cli;
mod config;
mod database;
mod health_check;
mod price;
mod set;
mod utils;

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
    let http_client = Arc::new(HttpClient::new());

    // Create CLI controller with feature services
    let cli_controller = CliController::new(
        card::service::CardService::new(connection_pool.clone(), http_client.clone()),
        set::service::SetService::new(connection_pool.clone(), http_client.clone()),
        price::service::PriceService::new(connection_pool.clone(), http_client.clone()),
        health_check::service::HealthCheckService::new(connection_pool),
    );

    if let Err(e) = cli_controller.handle_command(cli.command).await {
        eprint!("Error: {e}");
        std::process::exit(1);
    }
    info!("✨ Scry complete.");
    Ok(())
}

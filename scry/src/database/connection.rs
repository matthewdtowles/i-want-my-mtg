use crate::config::Config;
use anyhow::Result;
use sqlx::{postgres::PgPoolOptions, PgPool};
use tracing::info;

pub async fn create_pool(config: &Config) -> Result<PgPool> {
    info!("Establishing connection to the data realm...");

    let pool = PgPoolOptions::new()
        .max_connections(config.max_pool_size)
        .connect(&config.database_url)
        .await?;

    info!(
        "Connected to database with {} max connections",
        config.max_pool_size
    );
    Ok(pool)
}

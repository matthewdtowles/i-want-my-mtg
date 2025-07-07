use anyhow::Result;
use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub max_pool_size: u32,
    pub price_retention_days: i16,
    pub archive_batch_size: i16,
    pub mtgjson_api_url: String,
    pub scryfall_api_url: String,
    pub request_delay_ms: u64,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(Config {
            database_url: Self::get_database_url()?,
            max_pool_size: Self::parse_env("DB_MAX_POOL_SIZE", "10")?,
            price_retention_days: Self::parse_env("PRICE_RETENTION_DAYS", "7")?,
            archive_batch_size: Self::parse_env("ARCHIVE_BATCH_SIZE", "1000")?,
            mtgjson_api_url: env::var("MTGJSON_API_URL")
                .unwrap_or_else(|_| "https://mtgjson.com/api/v5".to_string()),
            scryfall_api_url: env::var("SCRYFALL_API_URL")
                .unwrap_or_else(|_| "https://api.scryfall.com".to_string()),
            request_delay_ms: Self::parse_env("REQUEST_DELAY_MS", "100")?,
        })
    }

    fn get_database_url() -> Result<String> {
        if let Ok(url) = env::var("DATABASE_URL") {
            return Ok(url);
        }

        env::var("DATABASE_URL").or_else(|_| {
            let host = env::var("DB_HOST")?;
            let port = env::var("DB_PORT")?;
            let username = env::var("DB_USERNAME")?;
            let password = env::var("DB_PASSWORD")?;
            let database = env::var("DB_NAME")?;
            Ok(format!("postgresql://{}:{}@{}:{}/{}", 
                username, password, host, port, database))
        })
    }

    fn parse_env<T: std::str::FromStr>(key: &str, default: &str) -> Result<T>
    where
        T::Err: std::fmt::Display,
    {
        env::var(key)
            .unwrap_or_else(|_| default.to_string())
            .parse()
            .map_err(|e| anyhow::anyhow!("Failed to parse {}: {}", key, e))
    }
}
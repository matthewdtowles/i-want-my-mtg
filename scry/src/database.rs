mod service;
pub mod repositories;

pub use service::DatabaseService;
pub use repositories::{
    card::CardRepository,
    price::PriceRepository,
    set::SetRepository,
};

pub async fn create_database_service(config: &crate::config::Config) -> anyhow::Result<DatabaseService> {
    DatabaseService::new(config).await
}
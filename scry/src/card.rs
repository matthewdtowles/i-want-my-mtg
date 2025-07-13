pub mod ingestion_service;
mod card_rarity;
mod client;
mod format;
mod legality_status;
mod legality;
mod mapper;
mod card;
mod repository;

pub use ingestion_service::CardIngestionService;
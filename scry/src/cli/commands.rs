use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "Scry")]
#[command(about = "Scry: MTG Data Ingestion and Management Tool")]
#[command(version)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Ingest MTG Data - default: all
    Ingest {
        #[arg(short, long, help = "Ingest all sets.")]
        sets: bool,
        #[arg(short, long, help = "Ingest all cards.")]
        cards: bool,
        #[arg(
            short,
            long,
            help = "Archive previous prices and ingest all prices for today."
        )]
        prices: bool,
        #[arg(
            short = 'k',
            long,
            help = "Ingest all cards for given set. E.g.: `ingest -k abc` for cards in set `abc`."
        )]
        set_cards: Option<String>,
        #[arg(short, long, help = "Reset all data prior to ingestion.")]
        reset: bool,
    },

    /// Prune unwanted ingested data
    PostIngestPrune {},

    /// Save set sizes, prices, & fix main set misclassifications
    /// Note: Set Prices rely on accurate sizes
    PostIngestUpdates {},

    /// Run cleanup operations
    /// Only necessary if filtering rules updated to remove previously saved sets/cards
    Cleanup {
        #[arg(
            short,
            long,
            help = "Uses stream parser to remove individual cards based on individual card filtering rules."
        )]
        cards: bool,
        #[arg(
            short = 'n',
            long = "batch-size",
            help = "Batch size for deletes",
            default_value_t = 500
        )]
        batch_size: i64,
    },

    /// Check system health and data integrity
    Health {
        #[arg(long, help = "Perform detailed health check")]
        detailed: bool,
        #[arg(
            long,
            help = "Check price_history table health (bloat, vacuum, retention)"
        )]
        price_history: bool,
    },

    /// Apply tiered retention policy to price_history table
    /// Keeps: daily (7 days), weekly/Mondays (7-28 days), monthly/1st (28+ days)
    Retention {},

    /// Truncate the entire price_history table (requires confirmation)
    TruncateHistory {},
}

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

    /// Check system health and data integrity
    Health {
        #[arg(long, help = "Perform detailed health check")]
        detailed: bool,
    },

    /// Run cleanup operations (separate from ingestion)
    Cleanup {
        #[arg(short, long, help = "Run cleanup for cards")]
        cards: bool,
        #[arg(short, long, help = "Run cleanup for sets (online-only sets)")]
        sets: bool,
        #[arg(
            short = 'n',
            long = "batch-size",
            help = "Batch size for deletes",
            default_value_t = 500
        )]
        batch_size: i64,
    },
}

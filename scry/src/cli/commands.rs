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
    /// Ingest card data for a specific set or all sets
    Cards {
        #[arg(short, long, help = "Specific set code to ingest (e.g., 'BRO', 'DMU')")]
        set_code: Option<String>,
    },

    /// Ingest the complete list of MTG sets
    Sets,

    /// Ingest today's pricing data (automatically archives old prices first)
    Prices,

    /// Check system health and data integrity
    Health {
        #[arg(long, help = "Perform detailed health check")]
        detailed: bool,
    },
}

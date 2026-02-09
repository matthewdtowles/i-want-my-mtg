use chrono::NaiveDate;
use sqlx::FromRow;
use tracing::{info, warn};

#[derive(Debug)]
pub struct BasicHealthStatus {
    pub card_count: i64,
    pub price_count: i64,
    pub set_count: i64,
}

impl BasicHealthStatus {
    pub fn display(&self) {
        info!("=== SYSTEM HEALTH REPORT ===");
        info!("Cards in database: {}", self.card_count);
        info!("Current prices: {}", self.price_count);
        info!("Sets in database: {}", self.set_count);
        info!("=== END HEALTH REPORT ===");
    }
}

#[derive(Debug)]
pub struct DetailedHealthStatus {
    pub basic: BasicHealthStatus,
    pub cards_with_prices: i64,
    pub cards_without_prices: i64,
}

impl DetailedHealthStatus {
    pub fn display(&self) {
        self.basic.display();
        info!("=== DETAILED HEALTH CHECK ===");
        info!("Cards with prices: {}", self.cards_with_prices);
        info!("Cards without prices: {}", self.cards_without_prices);
        info!("=== END DETAILED REPORT ===");
    }
}

#[derive(Debug, FromRow)]
pub struct TableStats {
    pub live_rows: i64,
    pub dead_rows: i64,
    pub dead_pct: Option<f64>,
    pub table_size: String,
    pub last_vacuum: Option<String>,
    pub last_autovacuum: Option<String>,
}

#[derive(Debug, FromRow)]
pub struct RetentionPeriod {
    pub retention_period: String,
    pub row_count: i64,
    pub oldest_date: NaiveDate,
    pub newest_date: NaiveDate,
}

#[derive(Debug)]
pub struct PriceHistoryHealth {
    pub stats: TableStats,
    pub retention_periods: Vec<RetentionPeriod>,
    pub is_healthy: bool,
}

impl PriceHistoryHealth {
    pub fn display(&self) {
        info!("=========================================");
        info!("Price History Table Health Check");
        info!("=========================================");
        info!("");
        info!("Table Size: {}", self.stats.table_size);
        info!("Live Rows: {}", self.stats.live_rows);
        info!("Dead Rows: {}", self.stats.dead_rows);
        info!(
            "Dead %: {}%",
            self.stats
                .dead_pct
                .map(|v| format!("{:.2}", v))
                .unwrap_or_else(|| "N/A".to_string())
        );
        info!(
            "Last Manual VACUUM: {}",
            self.stats
                .last_vacuum
                .as_deref()
                .unwrap_or("Never")
        );
        info!(
            "Last Auto VACUUM: {}",
            self.stats
                .last_autovacuum
                .as_deref()
                .unwrap_or("Never")
        );
        info!("");

        if let Some(pct) = self.stats.dead_pct {
            if pct > 20.0 {
                warn!(
                    "WARNING: High dead tuple percentage ({:.2}%)",
                    pct
                );
                warn!("  Recommendation: Run 'scry retention' or manual VACUUM");
            }
        }

        if self.stats.dead_rows > 100_000 {
            warn!(
                "WARNING: High dead row count ({})",
                self.stats.dead_rows
            );
            warn!("  Recommendation: Run 'scry retention'");
        }

        info!("Retention Distribution:");
        for period in &self.retention_periods {
            info!(
                "  {}: {} rows ({} to {})",
                period.retention_period,
                period.row_count,
                period.oldest_date,
                period.newest_date
            );
        }

        info!("");
        if self.is_healthy {
            info!("Table health: GOOD");
        } else {
            warn!("Table health: NEEDS ATTENTION");
        }
        info!("=========================================");
    }
}
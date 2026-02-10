use crate::database::ConnectionPool;
use crate::health_check::models::{
    BasicHealthStatus, DetailedHealthStatus, PriceHistoryHealth, RetentionPeriod, TableStats,
};
use anyhow::Result;
use sqlx::QueryBuilder;
use std::sync::Arc;
use tracing::info;

pub struct HealthCheckService {
    db: Arc<ConnectionPool>,
}

impl HealthCheckService {
    pub fn new(db: Arc<ConnectionPool>) -> Self {
        Self { db }
    }

    pub async fn basic_check(&self) -> Result<BasicHealthStatus> {
        info!("Performing basic health check");
        let card_count = self.count_cards().await?;
        let price_count = self.count_prices().await?;
        let set_count = self.count_sets().await?;
        Ok(BasicHealthStatus {
            card_count,
            price_count,
            set_count,
        })
    }

    pub async fn detailed_check(&self) -> Result<DetailedHealthStatus> {
        info!("Performing detailed health check");
        let basic = self.basic_check().await?;
        let cards_with_prices = self.count_cards_with_prices().await?;
        let cards_without_prices = basic.card_count - cards_with_prices;
        Ok(DetailedHealthStatus {
            basic,
            cards_with_prices,
            cards_without_prices,
        })
    }

    pub async fn price_history_check(&self) -> Result<PriceHistoryHealth> {
        info!("Performing price history health check");

        let stats_query = QueryBuilder::new(
            "SELECT \
                n_live_tup AS live_rows, \
                n_dead_tup AS dead_rows, \
                round(n_dead_tup * 100.0 / NULLIF(n_live_tup + n_dead_tup, 0), 2)::float8 AS dead_pct, \
                pg_size_pretty(pg_total_relation_size('public.price_history')) AS table_size, \
                COALESCE(last_vacuum::text, 'Never') AS last_vacuum, \
                COALESCE(last_autovacuum::text, 'Never') AS last_autovacuum \
            FROM pg_stat_user_tables \
            WHERE relname = 'price_history'",
        );
        let stats: TableStats = self.db.fetch_one_query_builder(stats_query).await?;

        let retention_query = QueryBuilder::new(
            "SELECT \
                CASE \
                    WHEN date >= CURRENT_DATE - INTERVAL '7 days' THEN 'Last 7 days (daily)' \
                    WHEN date >= CURRENT_DATE - INTERVAL '28 days' THEN 'Week 2-4 (weekly)' \
                    ELSE 'Older (monthly)' \
                END as retention_period, \
                COUNT(*) as row_count, \
                MIN(date) as oldest_date, \
                MAX(date) as newest_date \
            FROM price_history \
            GROUP BY 1 \
            ORDER BY MAX(date) DESC",
        );
        let retention_periods: Vec<RetentionPeriod> =
            self.db.fetch_all_query_builder(retention_query).await?;

        let is_healthy = match stats.dead_pct {
            Some(pct) => pct <= 20.0 && stats.dead_rows <= 100_000,
            None => stats.dead_rows <= 100_000,
        };

        Ok(PriceHistoryHealth {
            stats,
            retention_periods,
            is_healthy,
        })
    }

    async fn count_cards_with_prices(&self) -> Result<i64> {
        self.db
            .count("SELECT COUNT(DISTINCT card_id) FROM price")
            .await
    }

    async fn count_cards(&self) -> Result<i64> {
        self.db.count("SELECT COUNT(*) FROM card").await
    }

    async fn count_prices(&self) -> Result<i64> {
        self.db.count("SELECT COUNT(*) FROM price").await
    }

    async fn count_sets(&self) -> Result<i64> {
        self.db.count("SELECT COUNT(*) FROM set").await
    }
}

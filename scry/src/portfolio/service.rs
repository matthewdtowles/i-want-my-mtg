use crate::database::ConnectionPool;
use crate::portfolio::repository::PortfolioRepository;
use anyhow::Result;
use std::collections::HashMap;
use std::sync::Arc;
use tracing::debug;

pub struct PortfolioService {
    repository: PortfolioRepository,
}

impl PortfolioService {
    pub fn new(db: Arc<ConnectionPool>) -> Self {
        Self {
            repository: PortfolioRepository::new(db),
        }
    }

    pub async fn snapshot_portfolio_values(&self) -> Result<i64> {
        debug!("Calculating portfolio values for all users");
        let mut snapshots = self.repository.calculate_portfolio_values().await?;
        debug!("Found {} users with inventory", snapshots.len());

        if snapshots.is_empty() {
            return Ok(0);
        }

        let total_costs = self.repository.calculate_total_costs().await?;
        let cost_map: HashMap<i32, rust_decimal::Decimal> =
            total_costs.into_iter().collect();

        for snapshot in &mut snapshots {
            if let Some(cost) = cost_map.get(&snapshot.user_id) {
                snapshot.total_cost = Some(*cost);
            }
        }

        let saved = self.repository.save_snapshots(&snapshots).await?;
        debug!("Saved {} portfolio value snapshots", saved);
        Ok(saved)
    }

    pub async fn compute_portfolio_summaries(&self) -> Result<(i64, i64)> {
        debug!("Computing portfolio summaries for all users");

        let mut summaries = self.repository.calculate_portfolio_summaries().await?;
        debug!("Found {} users with inventory", summaries.len());

        if summaries.is_empty() {
            return Ok((0, 0));
        }

        // Merge transaction cost data
        let total_costs = self.repository.calculate_total_costs().await?;
        let cost_map: HashMap<i32, rust_decimal::Decimal> =
            total_costs.into_iter().collect();

        // Merge realized gains
        let realized_gains = self.repository.calculate_realized_gains().await?;
        let gain_map: HashMap<i32, rust_decimal::Decimal> =
            realized_gains.into_iter().collect();

        for summary in &mut summaries {
            if let Some(cost) = cost_map.get(&summary.user_id) {
                summary.total_cost = Some(*cost);
            }
            if let Some(gain) = gain_map.get(&summary.user_id) {
                summary.total_realized_gain = Some(*gain);
            }
        }

        let saved_summaries = self.repository.save_summaries(&summaries).await?;
        debug!("Saved {} portfolio summaries", saved_summaries);

        // Compute and save per-card performance
        let card_performance = self.repository.calculate_card_performance().await?;
        debug!("Computed {} card performance rows", card_performance.len());
        let saved_performance = self.repository.save_card_performance(&card_performance).await?;
        debug!("Saved {} card performance rows", saved_performance);

        Ok((saved_summaries, saved_performance))
    }

    pub async fn apply_retention(&self) -> Result<(i64, i64)> {
        let weekly = self.repository.apply_weekly_retention().await?;
        let monthly = self.repository.apply_monthly_retention().await?;
        Ok((weekly, monthly))
    }

    pub async fn vacuum(&self) -> Result<()> {
        self.repository.vacuum().await
    }
}

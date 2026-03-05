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

    pub async fn apply_retention(&self) -> Result<(i64, i64)> {
        let weekly = self.repository.apply_weekly_retention().await?;
        let monthly = self.repository.apply_monthly_retention().await?;
        Ok((weekly, monthly))
    }

    pub async fn vacuum(&self) -> Result<()> {
        self.repository.vacuum().await
    }
}

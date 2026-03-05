use crate::database::ConnectionPool;
use crate::portfolio::domain::PortfolioValueSnapshot;
use anyhow::Result;
use sqlx::QueryBuilder;
use std::sync::Arc;

#[derive(Clone)]
pub struct PortfolioRepository {
    db: Arc<ConnectionPool>,
}

impl PortfolioRepository {
    pub fn new(db: Arc<ConnectionPool>) -> Self {
        Self { db }
    }

    pub async fn calculate_portfolio_values(&self) -> Result<Vec<PortfolioValueSnapshot>> {
        let qb = QueryBuilder::new(
            "SELECT
                i.user_id,
                COALESCE(SUM(
                    i.quantity * CASE WHEN i.foil THEN COALESCE(p.foil, p.normal, 0)
                                      ELSE COALESCE(p.normal, p.foil, 0) END
                ), 0)::numeric(12,2) AS total_value,
                NULL::numeric(12,2) AS total_cost,
                COALESCE(SUM(i.quantity), 0)::int AS total_cards,
                CURRENT_DATE AS date
            FROM inventory i
            JOIN price p ON p.card_id = i.card_id
            GROUP BY i.user_id",
        );
        self.db.fetch_all_query_builder(qb).await
    }

    pub async fn calculate_total_costs(&self) -> Result<Vec<(i32, rust_decimal::Decimal)>> {
        let qb = QueryBuilder::new(
            "SELECT
                t.user_id,
                COALESCE(SUM(
                    CASE WHEN t.type = 'BUY' THEN t.quantity * t.price_per_unit
                         WHEN t.type = 'SELL' THEN -t.quantity * t.price_per_unit
                         ELSE 0 END
                ), 0)::numeric(12,2) AS total_cost
            FROM \"transaction\" t
            GROUP BY t.user_id
            HAVING SUM(CASE WHEN t.type = 'BUY' THEN t.quantity ELSE 0 END) > 0",
        );
        let rows: Vec<(i32, rust_decimal::Decimal)> = self.db.fetch_all_query_builder(qb).await?;
        Ok(rows)
    }

    pub async fn save_snapshots(&self, snapshots: &[PortfolioValueSnapshot]) -> Result<i64> {
        if snapshots.is_empty() {
            return Ok(0);
        }
        let mut qb = QueryBuilder::new(
            "INSERT INTO portfolio_value_history (user_id, total_value, total_cost, total_cards, date)",
        );
        qb.push_values(snapshots, |mut b, s| {
            b.push_bind(s.user_id)
                .push_bind(&s.total_value)
                .push_bind(&s.total_cost)
                .push_bind(s.total_cards)
                .push_bind(s.date);
        });
        qb.push(
            " ON CONFLICT (user_id, date) DO UPDATE SET
                total_value = EXCLUDED.total_value,
                total_cost = COALESCE(EXCLUDED.total_cost, portfolio_value_history.total_cost),
                total_cards = EXCLUDED.total_cards",
        );
        self.db.execute_query_builder(qb).await
    }

    pub async fn apply_weekly_retention(&self) -> Result<i64> {
        self.db
            .count(
                "WITH deleted AS ( \
                    DELETE FROM portfolio_value_history \
                    WHERE date >= CURRENT_DATE - INTERVAL '28 days' \
                      AND date < CURRENT_DATE - INTERVAL '7 days' \
                      AND EXTRACT(DOW FROM date) NOT IN (1) \
                    RETURNING 1 \
                ) \
                SELECT COUNT(*) FROM deleted",
            )
            .await
    }

    pub async fn apply_monthly_retention(&self) -> Result<i64> {
        self.db
            .count(
                "WITH deleted AS ( \
                    DELETE FROM portfolio_value_history \
                    WHERE date < CURRENT_DATE - INTERVAL '28 days' \
                      AND EXTRACT(DAY FROM date) != 1 \
                    RETURNING 1 \
                ) \
                SELECT COUNT(*) FROM deleted",
            )
            .await
    }

    pub async fn vacuum(&self) -> Result<()> {
        self.db
            .execute_raw("VACUUM ANALYZE portfolio_value_history")
            .await
    }
}

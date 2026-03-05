use chrono::NaiveDate;
use rust_decimal::Decimal;
use sqlx::FromRow;

#[derive(Clone, Debug, FromRow)]
pub struct PortfolioValueSnapshot {
    pub user_id: i32,
    pub total_value: Decimal,
    pub total_cost: Option<Decimal>,
    pub total_cards: i32,
    pub date: NaiveDate,
}

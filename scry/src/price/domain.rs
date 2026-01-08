use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct Price {
    pub id: Option<i32>,
    pub card_id: String,
    pub foil: Option<Decimal>,
    pub normal: Option<Decimal>,
    pub date: NaiveDate,
}

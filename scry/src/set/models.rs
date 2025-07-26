use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct Set {
    pub code: String,
    pub base_size: i32,
    pub block: Option<String>,
    pub keyrune_code: String,
    pub name: String,
    pub parent_code: Option<String>,
    pub release_date: NaiveDate,
    pub set_type: String,
}

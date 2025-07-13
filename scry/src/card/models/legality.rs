use crate::card::{models::Format, models::LegalityStatus};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct Legality {
    pub card_id: String,
    pub format: Format,
    pub status: LegalityStatus,
}

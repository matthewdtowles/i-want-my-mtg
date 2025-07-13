use crate::card::{format::Format, legality_status::LegalityStatus};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct Legality {
    pub card_id: String,
    pub format: Format,
    pub status: LegalityStatus,
}

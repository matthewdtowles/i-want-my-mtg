use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, FromRow, Serialize, Deserialize)]
pub struct Card {
    pub id: String,
    pub artist: Option<String>,
    pub has_foil: bool,
    pub has_non_foil: bool,
    pub img_src: String,
    pub is_reserved: bool,
    pub mana_cost: Option<String>,
    pub name: String,
    pub oracle_text: Option<String>,
    pub rarity: String,
    pub set_code: String,
    pub card_type: String,
    pub order: Option<i32>,
}

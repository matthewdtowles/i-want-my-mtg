use serde::{Deserialize, Serialize};
use sqlx::FromRow;

use crate::models::CardRarity;

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
    pub rarity: CardRarity,
    pub set_code: String,
    pub type_line: String,
    pub order: Option<i32>,
}

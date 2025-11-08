use crate::card::models::{CardRarity, Legality};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Clone, Debug, FromRow, Serialize, Deserialize)]
pub struct Card {
    pub id: String,
    pub artist: Option<String>,
    pub has_foil: bool,
    pub has_non_foil: bool,
    pub img_src: String,
    pub is_reserved: bool,
    pub mana_cost: Option<String>,
    pub name: String,
    pub number: String,
    pub oracle_text: Option<String>,
    pub rarity: CardRarity,
    pub set_code: String,
    pub type_line: String,

    #[sqlx(skip)]
    pub legalities: Vec<Legality>,

    // transient flag from soure JSON
    // not persisted to DB!
    pub is_online_only: bool,
}

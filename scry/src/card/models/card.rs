use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Clone, Debug, FromRow, Serialize, Deserialize)]
pub struct Card {
    pub id: String,
    pub artist: Option<String>,
    pub has_foil: bool,
    pub has_non_foil: bool,
    pub img_src: String,
    pub in_main: bool,
    pub is_alternative: bool,
    pub is_reserved: bool,
    pub layout: String,
    pub mana_cost: Option<String>,
    pub name: String,
    pub number: String,
    pub oracle_text: Option<String>,
    pub rarity: super::CardRarity,
    pub set_code: String,
    pub sort_number: String,

    #[sqlx(rename = "type")]
    pub type_line: String,

    #[sqlx(skip)]
    pub is_online_only: bool,
    #[sqlx(skip)]
    pub is_oversized: bool,
    #[sqlx(skip)]
    pub language: String,
    #[sqlx(skip)]
    pub legalities: Vec<super::Legality>,
    #[sqlx(skip)]
    pub other_face_ids: Option<Vec<String>>,
    #[sqlx(skip)]
    pub side: Option<String>,
}

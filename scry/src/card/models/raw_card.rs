use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct RawCard {
    #[serde(rename = "uuid")]
    pub id: String,
    pub artist: Option<String>,
    #[serde(rename = "hasFoil")]
    pub has_foil: bool,
    #[serde(rename = "hasNonFoil")]
    pub has_non_foil: bool,
    #[serde(rename = "isReserved")]
    pub is_reserved: bool,
    pub mana_cost: Option<String>,
    pub name: String,
    pub number: String,
    #[serde(rename = "text")]
    pub oracle_text: Option<String>,
    pub rarity: String,
    #[serde(rename = "setCode")]
    pub set_code: String,
    #[serde(rename = "type")]
    pub type_line: String

    // TODO: add legalities
}
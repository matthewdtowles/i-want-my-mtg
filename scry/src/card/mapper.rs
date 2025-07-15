use crate::card::models::Card;
use anyhow::Result;
use serde_json::Value;
use tracing::debug;

pub struct CardMapper;

impl CardMapper {
    pub fn new() -> Self {
        Self
    }

    pub fn map_mtg_json_to_cards(&self, set_data: Value) -> Result<Vec<Card>> {
        debug!("Mapping MTG JSON set data to cards");

        let cards_array = set_data
            .get("data")
            .and_then(|d| d.get("cards"))
            .and_then(|c| c.as_array())
            .ok_or_else(|| anyhow::anyhow!("Invalid MTG JSON set structure"))?;

        cards_array
            .iter()
            .map(|card_data| self.map_single_card(card_data))
            .collect()
    }

    pub fn map_single_card(&self, card_data: &Value) -> Result<Card> {
        let rarity_str = self.extract_string(card_data, "rarity")?;
        let rarity = rarity_str.parse()
            .map_err(|e| anyhow::anyhow!("Invalid rarity '{}': {}", rarity_str, e))?;

        Ok(Card {
            id: self.extract_string(card_data, "uuid")?,
            artist: self.extract_optional_string(card_data, "artist"),
            has_foil: self.extract_bool(card_data, "hasFoil"),
            has_non_foil: self.extract_bool(card_data, "hasNonFoil"),
            img_src: self.build_scryfall_img_path(card_data),
            is_reserved: self.extract_bool(card_data, "isReserved"),
            mana_cost: self.extract_optional_string(card_data, "manaCost"),
            name: self.extract_string(card_data, "name")?,
            number: self.extract_string(card_data, "number")?,
            oracle_text: self.extract_optional_string(card_data, "text"),
            rarity,
            set_code: self.extract_string(card_data, "setCode")?,
            type_line: self.extract_string(card_data, "type")?,
        })
    }

    // TODO: move to shared mapper???
    /// Returns `None` if the field is missing or not a string since it is optional.
    fn extract_optional_string(&self, data: &Value, field: &str) -> Option<String> {
        data.get(field)
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    }

    // TODO: move to shared mapper???
    fn extract_string(&self, data: &Value, field: &str) -> Result<String> {
        data.get(field)
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| anyhow::anyhow!("Missing or invalid field: {}", field))
    }

    // TODO: move to shared mapper???
    fn extract_bool(&self, data: &Value, field: &str) -> bool {
        data.get(field)
            .and_then(|v| v.as_str())
            .map(|s| s.eq_ignore_ascii_case("true"))
            .unwrap_or(false)
    }

    fn build_scryfall_img_path(&self, card_data: &Value) -> String {
        card_data
            .get("identifiers")
            .and_then(|identifiers| identifiers.get("scryfallId"))
            .and_then(|id| id.as_str())
            .map(|scryfall_id| {
                let chars: Vec<char> = scryfall_id.chars().collect();
                if chars.len() >= 2 {
                    format!("{}/{}/{}.jpg", chars[0], chars[1], scryfall_id)
                } else {
                    String::new()
                }
            })
            .unwrap_or_default()
    }
}

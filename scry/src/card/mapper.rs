use crate::card::models::{Card, CardRarity};
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
        let id = self.extract_string(card_data, "uuid")?;
        let name = self.extract_string(card_data, "name")?;
        let set_code = self.extract_string(card_data, "setCode")?;
        let number = self.extract_optional_string(card_data, "number").unwrap_or_else(|| "0".to_string());
        let type_line = self.extract_optional_string(card_data, "type").unwrap_or_default();
        
        let rarity_str = self.extract_optional_string(card_data, "rarity").unwrap_or_else(|| "common".to_string());
        let rarity = rarity_str.parse::<CardRarity>().unwrap_or(CardRarity::Common);
        
        let mana_cost = self.extract_optional_string(card_data, "manaCost");
        let oracle_text = self.extract_optional_string(card_data, "text");
        let artist = self.extract_optional_string(card_data, "artist");
        
        let has_foil = card_data.get("hasFoil").and_then(|v| v.as_bool()).unwrap_or(false);
        let has_non_foil = card_data.get("hasNonFoil").and_then(|v| v.as_bool()).unwrap_or(true);
        let is_reserved = card_data.get("isReserved").and_then(|v| v.as_bool()).unwrap_or(false);
        
        // Generate image URL (adjust based on your requirements)
        let img_src = format!("https://cards.scryfall.io/normal/front/{}.jpg", id);

        Ok(Card {
            id,
            artist,
            has_foil,
            has_non_foil,
            img_src,
            is_reserved,
            mana_cost,
            name,
            number,
            oracle_text,
            rarity,
            set_code,
            type_line,
        })
    }

    fn extract_string(&self, value: &Value, key: &str) -> Result<String> {
        value
            .get(key)
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| anyhow::anyhow!("Missing or invalid '{}' field", key))
    }

    fn extract_optional_string(&self, value: &Value, key: &str) -> Option<String> {
        value.get(key).and_then(|v| v.as_str()).map(|s| s.to_string())
    }
}

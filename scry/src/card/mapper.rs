// src/card_ingestion/mapper.rs
use anyhow::Result;
use serde_json::Value;
use tracing::debug;

use super::models::Card;

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

    pub fn map_mtg_json_all_to_cards(&self, all_data: Value) -> Result<Vec<Card>> {
        debug!("Mapping all MTG JSON data to cards");
        
        let data = all_data
            .get("data")
            .ok_or_else(|| anyhow::anyhow!("Invalid MTG JSON structure"))?;

        let mut all_cards = Vec::new();

        if let Value::Object(sets) = data {
            for (set_code, set_data) in sets {
                if let Some(cards_array) = set_data.get("cards").and_then(|c| c.as_array()) {
                    for card_data in cards_array {
                        match self.map_single_card(card_data) {
                            Ok(card) => all_cards.push(card),
                            Err(e) => {
                                debug!("Failed to map card in set {}: {}", set_code, e);
                                continue;
                            }
                        }
                    }
                }
            }
        }

        Ok(all_cards)
    }

    fn map_single_card(&self, card_data: &Value) -> Result<Card> {
        let uuid = card_data
            .get("uuid")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing card UUID"))?;

        let name = card_data
            .get("name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing card name"))?;

        let set_code = card_data
            .get("setCode")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing set code"))?;

        Ok(Card {
            id: None,
            uuid: uuid.to_string(),
            name: name.to_string(),
            set_code: set_code.to_string(),
            mana_cost: card_data.get("manaCost").and_then(|v| v.as_str()).map(|s| s.to_string()),
            type_line: card_data.get("type").and_then(|v| v.as_str()).map(|s| s.to_string()),
            oracle_text: card_data.get("text").and_then(|v| v.as_str()).map(|s| s.to_string()),
            rarity: card_data.get("rarity").and_then(|v| v.as_str()).map(|s| s.to_string()),
            created_at: None,
            updated_at: None,
        })
    }
}
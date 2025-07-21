use crate::card::models::{Card, CardRarity, RawCard};
use anyhow::Result;
use serde_json::Value;
use tracing::debug;

pub struct CardMapper;

impl CardMapper {
    pub fn map_mtg_json_to_cards(set_data: Value) -> Result<Vec<Card>> {
        debug!("Mapping MTG JSON set data to cards");

        let cards_array = set_data
            .get("data")
            .and_then(|d| d.get("cards"))
            .and_then(|c| c.as_array())
            .ok_or_else(|| anyhow::anyhow!("Invalid MTG JSON set structure"))?;

        cards_array
            .iter()
            .map(|card_data| CardMapper::map_raw_json(card_data))
            .collect()
    }

    pub fn map_single_card(raw_card: RawCard) -> Result<Card> {
        let img_src = format!("https://cards.scryfall.io/normal/front/{}.jpg", raw_card.id);
        Ok(Card {
            id: raw_card.id.clone(),
            artist: raw_card.artist.clone(),
            has_foil: raw_card.has_foil,
            has_non_foil: raw_card.has_non_foil,
            img_src,
            is_reserved: raw_card.is_reserved,
            mana_cost: raw_card.mana_cost.clone(),
            name: raw_card.name.clone(),
            number: raw_card.number.clone(),
            oracle_text: raw_card.oracle_text.clone(),
            rarity: raw_card
                .rarity
                .parse::<CardRarity>()
                .unwrap_or(CardRarity::Common),
            set_code: raw_card.set_code.clone(),
            type_line: raw_card.type_line.clone(),
        })
    }

    pub fn map_raw_json(card_data: &Value) -> Result<Card> {
        let id = Self::extract_string(card_data, "uuid")?;
        let name = Self::extract_string(card_data, "name")?;
        let set_code = Self::extract_string(card_data, "setCode")?;
        let number =
            Self::extract_optional_string(card_data, "number").unwrap_or_else(|| "0".to_string());
        let type_line = Self::extract_optional_string(card_data, "type").unwrap_or_default();

        let rarity_str = Self::extract_optional_string(card_data, "rarity")
            .unwrap_or_else(|| "common".to_string());
        let rarity = rarity_str
            .parse::<CardRarity>()
            .unwrap_or(CardRarity::Common);

        let mana_cost = Self::extract_optional_string(card_data, "manaCost");
        let oracle_text = Self::extract_optional_string(card_data, "text");
        let artist = Self::extract_optional_string(card_data, "artist");

        let has_foil = card_data
            .get("hasFoil")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        let has_non_foil = card_data
            .get("hasNonFoil")
            .and_then(|v| v.as_bool())
            .unwrap_or(true);
        let is_reserved = card_data
            .get("isReserved")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
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

    fn extract_string(value: &Value, key: &str) -> Result<String> {
        value
            .get(key)
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| anyhow::anyhow!("Missing or invalid '{}' field", key))
    }

    fn extract_optional_string(value: &Value, key: &str) -> Option<String> {
        value
            .get(key)
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    }
}

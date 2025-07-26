use crate::card::models::{Card, CardRarity, Format, Legality, LegalityStatus};
use anyhow::Result;
use serde_json::Value;

pub struct CardMapper;

impl CardMapper {
    pub fn map_mtg_json_to_cards(set_data: Value) -> Result<Vec<Card>> {
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

    pub fn map_raw_json(card_data: &Value) -> Result<Card> {
        let id = Self::extract_string(card_data, "uuid")?;
        let name = Self::extract_string(card_data, "name")?;
        let set_code = Self::extract_string(card_data, "setCode")?.to_lowercase();
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
        let img_src = Self::build_img_src(card_data)?;

        let legalities = if let Some(legalities_dto) = card_data.get("legalities") {
            Self::extract_legalities(legalities_dto, &id)?
        } else {
            Vec::new()
        };

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
            legalities,
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

    fn extract_legalities(
        legalities_dto: &serde_json::Value,
        card_id: &str,
    ) -> Result<Vec<Legality>> {
        let mut legalities = Vec::new();
        if let Some(obj) = legalities_dto.as_object() {
            for (format_str, status_str) in obj {
                if let (Ok(format), Ok(status)) = (
                    format_str.parse::<Format>(),
                    status_str.as_str().unwrap_or("").parse::<LegalityStatus>(),
                ) {
                    if let Some(legality) =
                        Legality::new_if_relevant(card_id.to_string(), format, status)
                    {
                        legalities.push(legality);
                    }
                }
            }
        }
        Ok(legalities)
    }

    fn build_img_src(card_data: &Value) -> Result<String> {
        let scryfall_id = card_data
            .get("identifiers")
            .and_then(|identifiers| identifiers.get("scryfallId"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing or invalid scryfallId"))?;
        if scryfall_id.len() >= 2 {
            let mut chars = scryfall_id.chars();
            let first = chars.next().unwrap();
            let second = chars.next().unwrap();
            Ok(format!("{}/{}/{}.jpg", first, second, scryfall_id))
        } else {
            Err(anyhow::anyhow!("ScryfallId too short: {}", scryfall_id))
        }
    }
}

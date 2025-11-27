use crate::card::models::{Card, CardRarity, Format, Legality, LegalityStatus};
use crate::utils::json;
use anyhow::Result;
use serde_json::Value;

pub struct CardMapper;

impl CardMapper {
    pub fn map_to_cards(set_data: Value) -> Result<Vec<Card>> {
        let cards_array = set_data
            .get("data")
            .and_then(|d| d.get("cards"))
            .and_then(|c| c.as_array())
            .ok_or_else(|| anyhow::anyhow!("Invalid MTG JSON set structure"))?;
        cards_array
            .iter()
            .filter(|c| {
                !c.get("isOnlineOnly")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
            })
            .map(|card_data| CardMapper::map_json_to_card(card_data))
            .collect()
    }

    pub fn map_json_to_card(card_data: &Value) -> Result<Card> {
        let id = json::extract_string(card_data, "uuid")?;
        let raw_name = json::extract_string(card_data, "name")?;
        let raw_face_name = json::extract_optional_string(card_data, "faceName");
        let set_code = json::extract_string(card_data, "setCode")?.to_lowercase();
        let number = json::extract_string(card_data, "number")?;
        let type_line = json::extract_string(card_data, "type")?;
        let rarity_str = json::extract_string(card_data, "rarity")?;
        let rarity = rarity_str
            .parse::<CardRarity>()
            .unwrap_or(CardRarity::Common);
        let mana_cost = json::extract_optional_string(card_data, "manaCost");
        let oracle_text = json::extract_optional_string(card_data, "text");
        let artist = json::extract_optional_string(card_data, "artist");
        let has_foil = card_data
            .get("hasFoil")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        let has_non_foil = card_data
            .get("hasNonFoil")
            .and_then(|v| v.as_bool())
            .unwrap_or(true);
        let is_alternative = card_data
            .get("isAlternative")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
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
        let layout = card_data
            .get("layout")
            .and_then(|v| v.as_str())
            .unwrap_or("normal")
            .to_string();
        let name = if layout == "aftermath" || layout == "split" {
            raw_name.clone()
        } else if let Some(face_name) = &raw_face_name {
            face_name.clone()
        } else {
            raw_name.clone()
        };
        let side = card_data
            .get("side")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        let other_face_ids = card_data
            .get("otherFaceIds")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|x| x.as_str().map(|s| s.to_string()))
                    .collect::<Vec<String>>()
            });
        let is_online_only = card_data
            .get("isOnlineOnly")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        let is_oversized = card_data
            .get("isOversized")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        let language = card_data
            .get("language")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_default();
        Ok(Card {
            id,
            artist,
            has_foil,
            has_non_foil,
            img_src,
            is_alternative,
            is_reserved,
            mana_cost,
            name,
            number,
            oracle_text,
            rarity,
            set_code,
            type_line,
            legalities,
            layout,
            is_online_only,
            side,
            other_face_ids,
            is_oversized,
            language,
        })
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

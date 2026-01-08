use crate::card::domain::{Card, CardNumber, MainSetClassifier};
use crate::card::models::{CardRarity, Format, Legality, LegalityStatus};
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
            .map(|card_data| Self::map_json_to_card(card_data))
            .collect()
    }

    pub fn map_json_to_card(card_data: &Value) -> Result<Card> {
        let id = json::extract_string(card_data, "uuid")?;
        let raw_name = json::extract_string(card_data, "name")?;
        let raw_face_name = json::extract_optional_string(card_data, "faceName");
        let set_code = json::extract_string(card_data, "setCode")?.to_lowercase();
        let number_str = json::extract_string(card_data, "number")?;

        // Validate number using CardNumber utility
        CardNumber::parse(&number_str)?;

        let type_line = json::extract_string(card_data, "type")?;
        let rarity_str = json::extract_string(card_data, "rarity")?;
        let rarity = rarity_str
            .parse::<CardRarity>()
            .unwrap_or(CardRarity::Common);
        let mana_cost = Self::build_mana_cost(json::extract_optional_string(card_data, "manaCost"));
        let oracle_text = json::extract_optional_string(card_data, "text");
        let artist = json::extract_optional_string(card_data, "artist");
        let has_foil = Self::has_foil(card_data);
        let has_non_foil = Self::has_non_foil(card_data) || !has_foil;
        let is_alternative = card_data
            .get("isAlternative")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        let is_reserved = card_data
            .get("isReserved")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        let img_src = Self::build_img_src(card_data)?;
        let in_main = MainSetClassifier::is_main_set_card(card_data);
        let layout = card_data
            .get("layout")
            .and_then(|v| v.as_str())
            .unwrap_or("normal")
            .to_string();

        let name = if layout == "aftermath" || layout == "split" {
            raw_name
        } else {
            raw_face_name.unwrap_or(raw_name)
        };

        let legalities = card_data
            .get("legalities")
            .map(|l| Self::extract_legalities(l, &id))
            .transpose()?
            .unwrap_or_default();

        let side = card_data
            .get("side")
            .and_then(|v| v.as_str())
            .map(String::from);
        let other_face_ids = card_data
            .get("otherFaceIds")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|x| x.as_str().map(String::from))
                    .collect()
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
            .unwrap_or("")
            .to_string();

        let sort_number = Self::normalize_sort_number(&number_str, in_main);

        Ok(Card {
            artist,
            has_foil,
            has_non_foil,
            id,
            img_src,
            in_main,
            is_alternative,
            is_online_only,
            is_oversized,
            is_reserved,
            language,
            layout,
            legalities,
            mana_cost,
            name,
            number: number_str,
            oracle_text,
            other_face_ids,
            rarity,
            set_code,
            side,
            sort_number,
            type_line,
        })
    }

    pub fn normalize_sort_number(input: &str, in_main: bool) -> String {
        let s = input.trim();
        let prefix = Self::build_sort_number_prefix(input, in_main);

        if let Some(idx) = s.find('-') {
            let (left, right) = s.split_at(idx);
            let right = &right[1..];
            let digits_end = right
                .find(|c: char| !c.is_ascii_digit())
                .unwrap_or(right.len());
            let (right_digits, right_rest) = right.split_at(digits_end);
            let padded_right = if right_digits.is_empty() {
                right.to_string()
            } else {
                format!("{:0>4}{}", right_digits, right_rest)
            };
            return format!("{}{}-{}", prefix, left, padded_right);
        }

        if s.starts_with(|c: char| c.is_ascii_digit()) {
            let digits_end = s.find(|c: char| !c.is_ascii_digit()).unwrap_or(s.len());
            let (digits, rest) = s.split_at(digits_end);
            return format!("{}{:0>6}{}", prefix, digits, rest);
        }

        if let Some(idx) = s.find(|c: char| c.is_ascii_digit()) {
            let (letters, digits_and_rest) = s.split_at(idx);
            let digits_end = digits_and_rest
                .find(|c: char| !c.is_ascii_digit())
                .unwrap_or(digits_and_rest.len());
            let (digits, rest) = digits_and_rest.split_at(digits_end);
            return format!("{}{}{:0>4}{}", prefix, letters, digits, rest);
        }

        format!("{}{}", prefix, s)
    }

    fn build_sort_number_prefix(input: &str, in_main: bool) -> String {
        let mut prefix = String::new();
        if !in_main {
            prefix.push('~');
        }
        if !input.is_ascii() {
            prefix.push('~');
        }
        prefix
    }

    fn get_finishes(card_data: &Value) -> Option<Vec<&str>> {
        card_data
            .get("finishes")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|f| f.as_str()).collect())
    }

    fn has_foil(card_data: &Value) -> bool {
        Self::get_finishes(card_data)
            .map(|f| f.contains(&"foil") || f.contains(&"etched"))
            .unwrap_or_else(|| {
                card_data
                    .get("hasFoil")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
            })
    }

    fn has_non_foil(card_data: &Value) -> bool {
        Self::get_finishes(card_data)
            .map(|f| f.contains(&"nonfoil"))
            .unwrap_or_else(|| {
                card_data
                    .get("hasNonFoil")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false)
            })
    }

    fn build_mana_cost(raw: Option<String>) -> Option<String> {
        raw.map(|cost| {
            let mut result = String::new();
            let mut chars = cost.chars().peekable();
            let mut in_brace = false;

            while let Some(ch) = chars.next() {
                match ch {
                    '{' => {
                        in_brace = true;
                        result.push(ch);
                    }
                    '}' => {
                        in_brace = false;
                        result.push(ch);
                    }
                    '/' if in_brace => {
                        // Skip slashes inside braces (hybrid mana)
                        continue;
                    }
                    '/' if chars.peek() == Some(&'/') => {
                        // Keep double slashes (split card separator)
                        result.push_str("//");
                        chars.next();
                    }
                    _ => {
                        result.push(ch.to_ascii_lowercase());
                    }
                }
            }
            result
        })
    }

    fn extract_legalities(legalities_dto: &Value, card_id: &str) -> Result<Vec<Legality>> {
        let Some(obj) = legalities_dto.as_object() else {
            return Ok(Vec::new());
        };

        Ok(obj
            .iter()
            .filter_map(|(format_str, status_str)| {
                let format = format_str.parse::<Format>().ok()?;
                let status = status_str.as_str()?.parse::<LegalityStatus>().ok()?;
                Legality::new_if_relevant(card_id.to_string(), format, status)
            })
            .collect())
    }

    fn build_img_src(card_data: &Value) -> Result<String> {
        let scryfall_id = card_data
            .get("identifiers")
            .and_then(|i| i.get("scryfallId"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing scryfallId"))?;

        if scryfall_id.len() < 2 {
            return Err(anyhow::anyhow!("ScryfallId too short"));
        }

        let first = scryfall_id.chars().next().unwrap();
        let second = scryfall_id.chars().nth(1).unwrap();
        Ok(format!("{}/{}/{}.jpg", first, second, scryfall_id))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_mana_cost_with_slashes() {
        let input = Some("{2/W}{W/G/P} // {U/R}".to_string());
        let result = CardMapper::build_mana_cost(input);
        assert_eq!(result, Some("{2w}{wgp} // {ur}".to_string()));
    }

    #[test]
    fn test_normalize_sort_number_simple() {
        assert_eq!(CardMapper::normalize_sort_number("1", true), "000001");
        assert_eq!(CardMapper::normalize_sort_number("123", true), "000123");
    }

    #[test]
    fn test_normalize_sort_number_non_ascii() {
        assert_eq!(CardMapper::normalize_sort_number("232†", true), "~000232†");
        assert_eq!(
            CardMapper::normalize_sort_number("232†", false),
            "~~000232†"
        );
    }

    #[test]
    fn test_normalize_sort_number_hyphen() {
        assert_eq!(CardMapper::normalize_sort_number("2-3", true), "2-0003");
    }
}

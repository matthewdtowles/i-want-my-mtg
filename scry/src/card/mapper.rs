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
        let mana_cost_str = json::extract_optional_string(card_data, "manaCost");
        let mana_cost = Self::build_mana_cost(mana_cost_str);
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
        let in_main = Self::in_main(card_data);
        let sort_number = Self::normalize_sort_number(&number, is_alternative, in_main);
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
            in_main,
            is_alternative,
            is_reserved,
            mana_cost,
            name,
            number,
            oracle_text,
            rarity,
            set_code,
            sort_number,
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

    fn get_finishes(card_data: &Value) -> Option<Vec<&str>> {
        card_data
            .get("finishes")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|f| f.as_str()).collect::<Vec<&str>>())
    }

    fn has_foil(card_data: &Value) -> bool {
        if let Some(finishes) = Self::get_finishes(card_data) {
            return finishes.contains(&"foil") || finishes.contains(&"etched");
        }
        return card_data
            .get("hasFoil")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
    }

    fn has_non_foil(card_data: &Value) -> bool {
        if let Some(finishes) = Self::get_finishes(card_data) {
            return finishes.contains(&"nonfoil");
        }
        return card_data
            .get("hasNonFoil")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
    }

    fn in_main(card_data: &Value) -> bool {
        if let Some(promo_types) = card_data.get("promoTypes").and_then(|v| v.as_array()) {
            if !Self::is_canon(promo_types) {
                return false;
            }
        }
        if let Some(booster_types) = card_data.get("boosterTypes").and_then(|v| v.as_array()) {
            let has_booster = booster_types
                .iter()
                .any(|v| v.as_str().map(|s| s == "default").unwrap_or(false));
            if !has_booster {
                return false;
            }
        } else {
            return false;
        }
        let set_code = match json::extract_string(card_data, "setCode") {
            Ok(code) => code.to_lowercase(),
            Err(_) => return false,
        };
        let num = json::extract_string(card_data, "number");
        if let Ok(num_str) = num {
            if !num_str.is_ascii() && set_code != "arn" {
                return false;
            }
        } else {
            return false;
        }
        true
    }

    fn is_canon(promo_types: &[Value]) -> bool {
        let allowed_promos = [
            "beginnerbox",
            "startercollection",
            "themepack",
            "intropack",
            "starterdeck",
            "welcome",
            "openhouse",
            "draftweekend",
            "league",
            "playtest",
            "release",
            "universesbeyond",
            "upsidedown",
            "ffi",
            "ffii",
            "ffiii",
            "ffiv",
            "ffix",
            "ffv",
            "ffvi",
            "ffvii",
            "ffviii",
            "ffx",
            "ffxi",
            "ffxii",
            "ffxiii",
            "ffxiv",
            "ffxv",
            "ffxvi",
        ];
        promo_types.iter().all(|promo| {
            promo
                .as_str()
                .map(|s| allowed_promos.contains(&s))
                .unwrap_or(false)
        })
    }

    fn normalize_sort_number(input: &str, is_alternative: bool, in_main: bool) -> String {
        let s = input.trim();
        let starts_with_digit = s.starts_with(|c: char| c.is_ascii_digit());
        // accumulate prefix markers — more markers push it later in sort order
        let mut prefix = String::new();
        if !in_main {
            prefix.push('~');
        }
        // non-ascii / misprint demotion
        if !s.is_ascii() {
            prefix.push('~');
        }

        if let Some(idx) = s.find('-') {
            let (left, right) = s.split_at(idx);
            let right = &right[1..]; // remove '-'
            let digits_end = right
                .find(|c: char| !c.is_ascii_digit())
                .unwrap_or(right.len());
            let (right_digits, right_rest) = right.split_at(digits_end);
            let padded_right = if right_digits.is_empty() {
                right.to_string()
            } else {
                format!("{:0>4}{}", right_digits, right_rest)
            };
            if starts_with_digit {
                format!("{}{}-{}", prefix, left, padded_right)
            } else {
                format!("~{}-{}", left, padded_right)
            }
        } else {
            if starts_with_digit {
                let digits_end = s.find(|c: char| !c.is_ascii_digit()).unwrap_or(s.len());
                let (digits, rest) = s.split_at(digits_end);
                let padded_left = format!("{:0>6}", digits);
                if s.contains(|c: char| !c.is_ascii()) && is_alternative {
                    return format!("~{}{}", padded_left, rest);
                }
                return format!("{}{}{}", prefix, padded_left, rest);
            }
            let first_digit_idx = s.find(|c: char| c.is_ascii_digit());
            if let Some(idx) = first_digit_idx {
                let (letters, digits_and_rest) = s.split_at(idx);
                let digits_end = digits_and_rest
                    .find(|c: char| !c.is_ascii_digit())
                    .unwrap_or(digits_and_rest.len());
                let (digits, rest) = digits_and_rest.split_at(digits_end);
                let padded_digits = format!("{:0>4}", digits);
                return format!("~{}{}{}", letters, padded_digits, rest);
            }
            format!("{}{}", prefix, s)
        }
    }

    fn build_mana_cost(raw_mana_cost: Option<String>) -> Option<String> {
        raw_mana_cost.map(|cost| {
            let mut result = String::new();
            let mut chars = cost.chars().peekable();

            while let Some(ch) = chars.next() {
                if ch == '/' {
                    if chars.peek() == Some(&'/') {
                        result.push('/');
                        result.push('/');
                        chars.next();
                    }
                } else {
                    result.push(ch.to_ascii_lowercase());
                }
            }
            result
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

/// UNIT TESTS
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_build_mana_cost_with_slashes_and_phyrexian() {
        let input = Some("{2/W}{W/G/P} // {U/R}{U/G/P}".to_string());
        let result = CardMapper::build_mana_cost(input);
        println!(
            "test_build_mana_cost_with_slashes_and_phyrexian -> {:?}",
            result
        );
        assert_eq!(result, Some("{2w}{wgp} // {ur}{ugp}".to_string()));
    }

    #[test]
    fn test_build_mana_cost_none() {
        let result = CardMapper::build_mana_cost(None);
        println!("test_build_mana_cost_none -> {:?}", result);
        assert_eq!(result, None);
    }

    #[test]
    fn test_get_finishes() {
        let v = json!({ "finishes": ["foil", "nonfoil"] });
        let arr = CardMapper::get_finishes(&v).unwrap();
        println!("test_get_finishes -> {:?}", arr);
        assert!(arr.contains(&"foil"));
        assert!(arr.contains(&"nonfoil"));
    }

    #[test]
    fn test_has_foil_with_finishes() {
        let v = json!({ "finishes": ["etched"] });
        let out = CardMapper::has_foil(&v);
        println!("test_has_foil_with_finishes -> {}", out);
        assert!(out);
    }

    #[test]
    fn test_has_foil_with_flag_fallback() {
        let v = json!({ "hasFoil": true });
        let out = CardMapper::has_foil(&v);
        println!("test_has_foil_with_flag_fallback -> {}", out);
        assert!(out);
    }

    #[test]
    fn test_has_non_foil_with_finishes() {
        let v = json!({ "finishes": ["nonfoil"] });
        let out = CardMapper::has_non_foil(&v);
        println!("test_has_non_foil_with_finishes -> {}", out);
        assert!(out);
    }

    #[test]
    fn test_has_non_foil_with_flag_fallback() {
        let v = json!({ "hasNonFoil": true });
        let out = CardMapper::has_non_foil(&v);
        println!("test_has_non_foil_with_flag_fallback -> {}", out);
        assert!(out);
    }

    #[test]
    fn test_is_canon_true_and_false() {
        let allowed = vec![json!("upsidedown"), json!("playtest")];
        let a = CardMapper::is_canon(&allowed);
        println!("test_is_canon_true -> {}", a);
        assert!(a);
        let disallowed = vec![json!("weirdpromo")];
        let d = CardMapper::is_canon(&disallowed);
        println!("test_is_canon_false -> {}", d);
        assert!(!d);
    }

    #[test]
    fn test_in_main_requires_booster_default() {
        let v = json!({
            "promoTypes": ["upsidedown"],
            "setCode": "UNH",
            "number": "1"
        });
        let out = CardMapper::in_main(&v);
        println!(
            "test_in_main_requires_booster_default (no boosters) -> {}",
            out
        );
        assert!(!out);

        let v2 = json!({
            "promoTypes": ["upsidedown"],
            "boosterTypes": ["default"],
            "setCode": "UNH",
            "number": "1"
        });
        let out2 = CardMapper::in_main(&v2);
        println!(
            "test_in_main_requires_booster_default (with default) -> {}",
            out2
        );
        assert!(out2);
    }

    #[test]
    fn test_in_main_non_ascii_number_demoted() {
        let v = json!({
            "boosterTypes": ["default"],
            "setCode": "XYZ",
            "number": "Ⅸ"
        });
        let out = CardMapper::in_main(&v);
        println!("test_in_main_non_ascii_number_demoted -> {}", out);
        assert!(!out);
    }

    #[test]
    fn test_normalize_sort_number_simple_digit() {
        let out = CardMapper::normalize_sort_number("1", false, true);
        println!("test_normalize_sort_number_simple_digit -> {}", out);
        assert_eq!(out, "000001");
    }

    #[test]
    fn test_normalize_sort_number_hyphen() {
        let out = CardMapper::normalize_sort_number("2-3", false, true);
        println!("test_normalize_sort_number_hyphen -> {}", out);
        assert_eq!(out, "2-0003");
    }

    #[test]
    fn test_normalize_sort_number_non_ascii() {
        let out = CardMapper::normalize_sort_number("232†", false, true);
        println!("test normalize_sort_number with input: '232†' -> result: {}", out);
        assert_eq!(out, "~000232†");
    }

    #[test]
    fn test_build_img_src_ok_and_error() {
        let v = json!({ "identifiers": { "scryfallId": "ab123" } });
        let path = CardMapper::build_img_src(&v).unwrap();
        println!("test_build_img_src_ok -> {}", path);
        assert_eq!(path, "a/b/ab123.jpg");

        let v2 = json!({ "identifiers": {} });
        let err = CardMapper::build_img_src(&v2).is_err();
        println!("test_build_img_src_error -> {}", err);
        assert!(err);
    }
}

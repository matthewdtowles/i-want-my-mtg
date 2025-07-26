use crate::{set::models::Set, utils::json};
use anyhow::Result;
use serde_json::Value;

pub struct SetMapper;

impl SetMapper {
    pub fn map_mtg_json_to_sets(set_data: Value) -> Result<Vec<Set>> {
        let sets_array = set_data
            .get("data")
            .and_then(|d| d.get("sets"))
            .and_then(|s| s.as_array())
            .ok_or_else(|| anyhow::anyhow!("Invalid MTG JSON set structure"))?;

        sets_array
            .iter()
            .map(|set_data| Self::map_mtg_json_to_set(set_data))
            .collect()
    }

    fn map_mtg_json_to_set(set_data: &Value) -> Result<Set> {
        let code = json::extract_string(set_data, "code")?.to_lowercase();
        let base_size: i32 = json::extract_int(set_data, "baseSize")?;
        let block = json::extract_optional_string(set_data, "block");
        let keyrune_code = json::extract_string(set_data, "keyruneCode")?;
        let name = json::extract_string(set_data, "name")?;
        let parent_code = match json::extract_optional_string(set_data, "parentCode") {
            Some(pc) => Some(pc.to_lowercase()),
            None => None,
        };
        let release_date = json::extract_date(set_data, "releaseDate")?;
        let set_type = json::extract_string(set_data, "setType")?;

        Ok(Set {
            code,
            base_size,
            block,
            keyrune_code,
            name,
            parent_code,
            release_date,
            set_type,
        })
    }
}

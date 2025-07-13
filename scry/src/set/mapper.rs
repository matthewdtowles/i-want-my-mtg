use crate::set::models::Set;
use anyhow::Result;
use serde_json::Value;
use tracing::debug;

pub struct SetMapper;

impl SetMapper {
    pub fn new() -> Self {
        Self
    }

    pub fn map_mtg_json_to_sets(&self, set_data: Value) -> Result<Vec<Set>> {
        debug!("Mapping MTG JSON set data to sets");

        let sets_array = set_data
            .get("data")
            .and_then(|d| d.get("sets"))
            .and_then(|s| s.as_array())
            .ok_or_else(|| anyhow::anyhow!("Invalid MTG JSON set structure"))?;

        sets_array
            .iter()
            .map(|set_data| self.map_mtg_json_to_set(set_data))
            .collect()
    }

    pub fn map_mtg_json_to_set(&self, set_data: &Value) -> Result<Set> {
        let code = set_data
            .get("code")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing set code"))?;

        let name = set_data
            .get("name")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing set name"))?;

        let release_date = set_data
            .get("releaseDate")
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing release date"))?;

        Ok(Set {
            code: code.to_string(),
            name: name.to_string(),
            release_date: todo!(), 
            base_size: todo!(),
            keyrune_code: todo!(),
            set_type: todo!(),
            block: todo!(),
            parent_code: todo!(),
        })
    }
}

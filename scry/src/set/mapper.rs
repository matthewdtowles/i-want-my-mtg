use crate::{set::models::Set, utils::json};
use anyhow::Result;
use serde_json::Value;

pub struct SetMapper;

impl SetMapper {
    /// include_online_only: when true include sets with isOnlineOnly=true in result.
    /// Default should be false so online-only sets are excluded during normal ingestion.
    // pub fn map_mtg_json_to_sets(set_data: Value, include_online_only: bool) -> Result<Vec<Set>> {
    //     let sets_array = set_data
    //         .get("data")
    //         .and_then(|d| d.as_array())
    //         .ok_or_else(|| anyhow::anyhow!("Invalid MTG JSON set structure"))?;

    //     sets_array
    //         .iter()
    //         .filter(|s| {
    //             if include_online_only {
    //                 true
    //             } else {
    //                 !s.get("isOnlineOnly")
    //                     .and_then(|v| v.as_bool())
    //                     .unwrap_or(false)
    //             }
    //         })
    //         .map(|set_data| Self::map_mtg_json_to_set(set_data))
    //         .collect()
    // }

    pub fn map_mtg_json_to_set(set_data: &Value, cleanup_online: bool) -> Result<Set> {
        let code = json::extract_string(set_data, "code")?.to_lowercase();
        let base_size: i32 = json::extract_int(set_data, "baseSetSize")?;
        let block = json::extract_optional_string(set_data, "block");
        let keyrune_code = json::extract_string(set_data, "keyruneCode")?.to_lowercase();
        let name = json::extract_string(set_data, "name")?;
        let parent_code = match json::extract_optional_string(set_data, "parentCode") {
            Some(pc) => Some(pc.to_lowercase()),
            None => None,
        };
        let release_date = json::extract_date(set_data, "releaseDate")?;
        let set_type = json::extract_string(set_data, "type")?;
        let json_online_flag = set_data
            .get("isOnlineOnly")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        let is_online_only = cleanup_online && json_online_flag;

        Ok(Set {
            code,
            base_size,
            block,
            keyrune_code,
            name,
            parent_code,
            release_date,
            set_type,
            is_online_only,
        })
    }
}

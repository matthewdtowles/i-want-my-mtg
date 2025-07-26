use crate::{database::ConnectionPool, set::models::Set};
use anyhow::Result;
use sqlx::QueryBuilder;
use std::sync::Arc;
use tracing::warn;

#[derive(Clone)]
pub struct SetRepository {
    db: Arc<ConnectionPool>,
}

impl SetRepository {
    pub fn new(db: Arc<ConnectionPool>) -> Self {
        Self { db }
    }

    pub async fn save_sets(&self, sets: &[Set]) -> Result<u64> {
        if sets.is_empty() {
            warn!("0 sets given, 0 sets saved.");
            return Ok(0);
        }
        let mut query_builder = QueryBuilder::new(
            "INSERT INTO set (
                    code, base_size, block, keyrune_code,
                    name, parent_code, release_date, type 
                )",
        );
        query_builder.push_values(sets, |mut b, set| {
            b.push_bind(&set.code)
                .push_bind(&set.base_size)
                .push_bind(&set.block)
                .push_bind(&set.keyrune_code)
                .push_bind(&set.name)
                .push_bind(&set.parent_code)
                .push_bind(&set.release_date)
                .push_bind(&set.set_type);
        });
        query_builder.push(
            " ON CONFLICT (code) DO UPDATE SET 
            base_size = EXCLUDED.base_size,
            block = EXCLUDED.block,
            keyrune_code = EXCLUDED.keyrune_code,
            name = EXCLUDED.name,
            parent_code = EXCLUDED.parent_code,
            release_date = EXCLUDED.release_date,
            type = EXCLUDED.type
        WHERE
            set.base_size IS DISTINCT FROM EXCLUDED.base_size OR
            set.block IS DISTINCT FROM EXCLUDED.block OR
            set.keyrune_code IS DISTINCT FROM EXCLUDED.keyrune_code OR
            set.name IS DISTINCT FROM EXCLUDED.name OR
            set.parent_code IS DISTINCT FROM EXCLUDED.parent_code OR
            set.release_date IS DISTINCT FROM EXCLUDED.release_date OR
            set.type IS DISTINCT FROM EXCLUDED.type",
        );
        self.db.execute_query_builder(query_builder).await
    }
}

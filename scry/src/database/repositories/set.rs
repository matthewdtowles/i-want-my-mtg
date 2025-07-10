use crate::database::DatabaseService;
use crate::models::Set;
use anyhow::Result;
use sqlx::QueryBuilder;
use std::sync::Arc;

#[derive(Clone)]
pub struct SetRepository {
    db: Arc<DatabaseService>,
}

impl SetRepository {
    pub fn new(db: Arc<DatabaseService>) -> Self {
        Self { db }
    }

    pub async fn bulk_insert(&self, sets: &[Set]) -> Result<u64> {
        if sets.is_empty() {
            return Ok(0);
        }

        let mut query_builder = QueryBuilder::new("INSERT INTO set (code, name) ");

        query_builder.push_values(sets, |mut b, set| {
            b.push_bind(&set.code).push_bind(&set.name);
        });

        query_builder.push(
            " ON CONFLICT (code) DO UPDATE SET 
            name = EXCLUDED.name",
        );

        self.db.execute_query_builder(query_builder).await
    }
}

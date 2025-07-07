// src/database/repositories/set.rs
use crate::database::DatabaseService;
use crate::models::Set;
use anyhow::Result;
use sqlx::QueryBuilder;

pub struct SetRepository {
    db: DatabaseService,
}

impl SetRepository {
    pub fn new(db: DatabaseService) -> Self {
        Self { db }
    }

    pub async fn bulk_insert(&self, sets: &[Set]) -> Result<u64> {
        if sets.is_empty() {
            return Ok(0);
        }

        let mut query_builder = QueryBuilder::new(
            "INSERT INTO set (scryfall_id, name, mana_cost, type_line, oracle_text, set_code) ",
        );

        query_builder.push_values(sets, |mut b, set| {
            b.push_bind(&set.scryfall_id)
                .push_bind(&set.name)
                .push_bind(&set.mana_cost)
                .push_bind(&set.type_line)
                .push_bind(&set.oracle_text)
                .push_bind(&set.set_code);
        });

        query_builder.push(
            " ON CONFLICT (scryfall_id) DO UPDATE SET 
            name = EXCLUDED.name,
            mana_cost = EXCLUDED.mana_cost,
            type_line = EXCLUDED.type_line,
            set_code = EXCLUDED.set_code
        ",
        );

        self.db.execute_query_builder(query_builder).await
    }

    pub async fn count(&self) -> Result<i64> {
        let query = "SELECT COUNT(*) FROM set";
        self.db.count(query, &[]).await
    }

    pub async fn find_by_set(&self, set_code: &str) -> Result<Vec<Set>> {
        let query = "SELECT id, scryfall_id, name, mana_cost, type_line, oracle_text, set_code, created_at, updated_at 
                     FROM set 
                     WHERE set_code = $1";

        self.db.fetch_all::<Set>(query, &[&set_code]).await
    }

    pub async fn find_by_scryfall_id(&self, scryfall_id: &str) -> Result<Option<Set>> {
        let query = "SELECT id, scryfall_id, name, mana_cost, type_line, oracle_text, set_code, created_at, updated_at 
                     FROM set 
                     WHERE scryfall_id = $1";

        self.db.fetch_optional::<Set>(query, &[&scryfall_id]).await
    }

    pub async fn search_by_name(&self, name: &str) -> Result<Vec<Set>> {
        let query = "SELECT id, scryfall_id, name, mana_cost, type_line, oracle_text, set_code, created_at, updated_at 
                     FROM set 
                     WHERE name ILIKE $1";

        let search_pattern = format!("%{}%", name);
        self.db.fetch_all::<Set>(query, &[&search_pattern]).await
    }
}

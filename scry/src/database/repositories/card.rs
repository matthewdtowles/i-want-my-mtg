// src/database/repositories/card.rs
use anyhow::Result;
use sqlx::QueryBuilder;

use crate::database::DatabaseService;
use crate::models::Card;

pub struct CardRepository<'db> {
    db: &'db DatabaseService,
}

impl<'db> CardRepository<'db> {
    pub fn new(db: &'db DatabaseService) -> Self {
        Self { db }
    }

    pub async fn bulk_insert(&self, cards: &[Card]) -> Result<u64> {
        if cards.is_empty() {
            return Ok(0);
        }

        let mut query_builder = QueryBuilder::new(
            "INSERT INTO card (scryfall_id, name, mana_cost, type_line, oracle_text, set_code) ",
        );

        query_builder.push_values(cards, |mut b, card| {
            b.push_bind(&card.id)
                .push_bind(&card.name)
                .push_bind(&card.mana_cost)
                .push_bind(&card.type_line)
                .push_bind(&card.oracle_text)
                .push_bind(&card.set_code);
        });

        query_builder.push(
            " ON CONFLICT (scryfall_id) DO UPDATE SET 
            name = EXCLUDED.name,
            mana_cost = EXCLUDED.mana_cost,
            type_line = EXCLUDED.type_line,
            oracle_text = EXCLUDED.oracle_text,
            set_code = EXCLUDED.set_code
        ",
        );

        self.db.execute_query_builder(query_builder).await
    }

    pub async fn count(&self) -> Result<i64> {
        let query = "SELECT COUNT(*) FROM card";
        self.db.count(query).await
    }

    pub async fn find_by_set(&self, set_code: &str) -> Result<Vec<Card>> {
        let query = "SELECT id, scryfall_id, name, mana_cost, type_line, oracle_text, set_code, created_at, updated_at 
                     FROM card 
                     WHERE set_code = $1";

        self.db.fetch_all_with_param::<Card, &str>(query, set_code).await
    }

    pub async fn find_by_scryfall_id(&self, scryfall_id: &str) -> Result<Option<Card>> {
        let query = "SELECT id, scryfall_id, name, mana_cost, type_line, oracle_text, set_code, created_at, updated_at 
                     FROM card 
                     WHERE scryfall_id = $1";

        self.db.fetch_optional_with_param::<Card, &str>(query, scryfall_id).await
    }

    pub async fn search_by_name(&self, name: &str) -> Result<Vec<Card>> {
        let query = "SELECT id, scryfall_id, name, mana_cost, type_line, oracle_text, set_code, created_at, updated_at 
                     FROM card 
                     WHERE name ILIKE $1";

        let search_pattern = format!("%{}%", name);
        self.db.fetch_all_with_param::<Card, String>(query, search_pattern).await
    }
}

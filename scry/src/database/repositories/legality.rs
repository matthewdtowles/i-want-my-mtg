// src/database/repositories/card.rs
use crate::database::DatabaseService;
use crate::models::Legality;
use anyhow::Result;
use sqlx::QueryBuilder;

pub struct LegalityRepository {
    db: DatabaseService,
}

impl LegalityRepository{
    pub fn new(db: DatabaseService) -> Self {
        Self { db }
    }

    pub async fn bulk_insert(&self, legalities: &[Legality]) -> Result<u64> {
        if legalities.is_empty() {
            return Ok(0);
        }

        let mut query_builder = QueryBuilder::new(
            "INSERT INTO legality (card_id, format, status) ",
        );

        query_builder.push_values(cards, |mut b, card| {
            b.push_bind(&card.scryfall_id)
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
        let query = "SELECT COUNT(*) FROM cards";
        self.db.count(query, &[]).await
    }

    pub async fn find_by_set(&self, set_code: &str) -> Result<Vec<Card>> {
        let query = "SELECT id, scryfall_id, name, mana_cost, type_line, oracle_text, set_code, created_at, updated_at 
                     FROM cards 
                     WHERE set_code = $1";

        self.db.fetch_all::<Card>(query, &[&set_code]).await
    }

    pub async fn find_by_scryfall_id(&self, scryfall_id: &str) -> Result<Option<Card>> {
        let query = "SELECT id, scryfall_id, name, mana_cost, type_line, oracle_text, set_code, created_at, updated_at 
                     FROM cards 
                     WHERE scryfall_id = $1";

        self.db.fetch_optional::<Card>(query, &[&scryfall_id]).await
    }

    pub async fn search_by_name(&self, name: &str) -> Result<Vec<Card>> {
        let query = "SELECT id, scryfall_id, name, mana_cost, type_line, oracle_text, set_code, created_at, updated_at 
                     FROM cards 
                     WHERE name ILIKE $1";

        let search_pattern = format!("%{}%", name);
        self.db.fetch_all::<Card>(query, &[&search_pattern]).await
    }
}

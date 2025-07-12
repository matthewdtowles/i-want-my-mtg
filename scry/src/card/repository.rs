use anyhow::Result;
use sqlx::QueryBuilder;
use std::sync::Arc;

use crate::database::ConnectionPool;
use super::models::Card;

#[derive(Clone)]
pub struct CardRepository {
    connection_pool: Arc<ConnectionPool>,
}

impl CardRepository {
    pub fn new(connection_pool: Arc<ConnectionPool>) -> Self {
        Self { connection_pool }
    }

    pub async fn bulk_insert(&self, cards: &[Card]) -> Result<u64> {
        if cards.is_empty() {
            return Ok(0);
        }

        let mut query_builder = QueryBuilder::new(
            "INSERT INTO card (id, name, set_code, mana_cost, type, oracle_text, rarity) "
        );

        query_builder.push_values(cards, |mut b, card| {
            b.push_bind(&card.id)
                .push_bind(&card.name)
                .push_bind(&card.set_code)
                .push_bind(&card.mana_cost)
                .push_bind(&card.type_line)
                .push_bind(&card.oracle_text)
                .push_bind(&card.rarity);
        });

        // TODO: keep or remove this? Do we need any others?
        query_builder.push(" ON CONFLICT (uuid) DO UPDATE SET name = EXCLUDED.name");

        self.connection_pool.execute_query_builder(query_builder).await
    }

    pub async fn count(&self) -> Result<i64> {
        let query = "SELECT COUNT(*) FROM card";
        self.connection_pool.count(query).await
    }

    pub async fn count_for_set(&self, set_code: &str) -> Result<i64> {
        let query = "SELECT COUNT(*) FROM card WHERE set_code = $1";
        self.connection_pool.count_with_param(query, set_code).await
    }
}
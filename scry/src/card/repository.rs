use crate::{card::Card, database::ConnectionPool};
use anyhow::Result;
use sqlx::QueryBuilder;
use tracing::{debug, warn};
use std::sync::Arc;

#[derive(Clone)]
pub struct CardRepository {
    db: Arc<ConnectionPool>,
}

impl CardRepository {
    pub fn new(connection_pool: Arc<ConnectionPool>) -> Self {
        Self {
            db: connection_pool,
        }
    }

    pub async fn save(&self, cards: &[Card]) -> Result<u64> {
        if cards.is_empty() {
            warn!("0 cards given, 0 cards saved.");
            return Ok(0);
        }
        debug!("Saving {} cards", cards.len());
        // TODO: evaluate: can we encapsulate INSERT INTO <table> (<model attrs.key>) (<model attrs.value>)
        let mut query_builder = QueryBuilder::new(
            "INSERT INTO card (
                    id, artist, has_foil, has_non_foil, img_src, 
                    is_reserved, mana_cost, name, number, oracle_text,
                    rarity, set_code, type
                )",
        );
        query_builder.push_values(cards, |mut b, card| {
            b.push_bind(&card.id)
                .push_bind(&card.artist)
                .push_bind(&card.has_foil)
                .push_bind(&card.has_non_foil)
                .push_bind(&card.img_src)
                .push_bind(&card.is_reserved)
                .push_bind(&card.mana_cost)
                .push_bind(&card.name)
                .push_bind(&card.number)
                .push_bind(&card.oracle_text)
                .push_bind(&card.rarity)
                .push_bind(&card.set_code)
                .push_bind(&card.type_line);
        });
        // TODO: evaluate if this can be encapsulated for reuse
        query_builder.push(
            " ON CONFLICT (id) DO UPDATE SET
            artist = EXCLUDED.artist,
            has_foil = EXCLUDED.has_foil,
            has_non_foil = EXCLUDED.has_non_foil,
            img_src = EXCLUDED.img_src,
            is_reserved = EXCLUDED.is_reserved,
            mana_cost = EXCLUDED.mana_cost,
            name = EXCLUDED.name,
            number = EXCLUDED.number,
            oracle_text = EXCLUDED.oracle_text,
            rarity = EXCLUDED.rarity,
            set_code = EXCLUDED.set_code,
            type = EXCLUDED.type
        WHERE
            card.artist IS DISTINCT FROM EXCLUDED.artist OR
            card.has_foil IS DISTINCT FROM EXCLUDED.has_foil OR
            card.has_non_foil IS DISTINCT FROM EXCLUDED.has_non_foil OR
            card.img_src IS DISTINCT FROM EXCLUDED.img_src OR
            card.is_reserved IS DISTINCT FROM EXCLUDED.is_reserved OR
            card.mana_cost IS DISTINCT FROM EXCLUDED.mana_cost OR
            card.name IS DISTINCT FROM EXCLUDED.name OR
            card.number IS DISTINCT FROM EXCLUDED.number OR
            card.oracle_text IS DISTINCT FROM EXCLUDED.oracle_text OR
            card.rarity IS DISTINCT FROM EXCLUDED.rarity OR
            card.set_code IS DISTINCT FROM EXCLUDED.set_code OR
            card.type IS DISTINCT FROM EXCLUDED.type"
        );
        self.db.execute_query_builder(query_builder).await
    }
}

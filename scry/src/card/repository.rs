use crate::{card::Card, database::ConnectionPool};
use anyhow::Result;
use sqlx::QueryBuilder;
use std::sync::Arc;
use tracing::{debug, error, info, warn};

#[derive(Clone)]
pub struct CardRepository {
    db: Arc<ConnectionPool>,
}

impl CardRepository {
    pub fn new(db: Arc<ConnectionPool>) -> Self {
        Self { db }
    }

    pub async fn save(&self, cards: &[Card]) -> Result<u64> {
        if cards.is_empty() {
            warn!("0 cards given, 0 cards saved.");
            return Ok(0);
        }
        let card_count = self.save_cards(cards).await?;
        let legality_count = self.save_legalities(cards).await?;
        info!(
            "Saved {} cards and {} legalities",
            card_count, legality_count
        );
        Ok(card_count)
    }

    pub async fn delete_all(&self) -> Result<u64> {
        self.delete_table(String::from("legality")).await?;
        let cards_deleted = self.delete_table(String::from("card")).await?;
        info!("{} cards deleted.", cards_deleted);
        Ok(cards_deleted)
    }

    async fn delete_table(&self, table: String) -> Result<u64> {
        let qb = QueryBuilder::new(format!("DELETE FROM {} CASCADE", table));
        let total_deleted = self.db.execute_query_builder(qb).await?;
        info!("{} {} entities deleted.", total_deleted, table);
        Ok(total_deleted)
    }

    async fn save_cards(&self, cards: &[Card]) -> Result<u64> {
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
            card.type IS DISTINCT FROM EXCLUDED.type",
        );
        match self.db.execute_query_builder(query_builder).await {
            Ok(rows_affected) => Ok(rows_affected),
            Err(e) => {
                error!("Failed to save {} cards: {}", cards.len(), e);
                Err(e)
            }
        }
    }

    async fn save_legalities(&self, cards: &[Card]) -> Result<u64> {
        let all_legalities: Vec<_> = cards.iter().flat_map(|c| &c.legalities).collect();

        if all_legalities.is_empty() {
            // Delete all legalities for these cards since they have none
            let card_ids: Vec<String> = cards.iter().map(|c| c.id.clone()).collect();
            if !card_ids.is_empty() {
                let mut delete_query =
                    QueryBuilder::new("DELETE FROM legality WHERE card_id = ANY(");
                delete_query.push_bind(card_ids);
                delete_query.push(")");
                self.db.execute_query_builder(delete_query).await?;
            }
            return Ok(0);
        }

        // Delete all existing legalities for these cards
        let card_ids: Vec<String> = cards.iter().map(|c| c.id.clone()).collect();
        let mut delete_query = QueryBuilder::new("DELETE FROM legality WHERE card_id = ANY(");
        delete_query.push_bind(card_ids);
        delete_query.push(")");
        self.db.execute_query_builder(delete_query).await?;

        // Insert all new legalities
        let mut query_builder = QueryBuilder::new("INSERT INTO legality (card_id, format, status)");
        query_builder.push_values(&all_legalities, |mut b, legality| {
            b.push_bind(&legality.card_id)
                .push_bind(&legality.format)
                .push_bind(&legality.status);
        });

        self.db.execute_query_builder(query_builder).await
    }
}

use crate::{card::models::Card, database::ConnectionPool};
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

    pub async fn save_cards(&self, cards: &[Card]) -> Result<u64> {
        if cards.is_empty() {
            warn!("0 cards given, 0 cards saved.");
            return Ok(0);
        }
        debug!("Saving {} cards", cards.len());
        let mut query_builder = QueryBuilder::new(
            "INSERT INTO card (
                id, artist, has_foil, has_non_foil, img_src, 
                is_reserved, mana_cost, name, number, oracle_text,
                rarity, set_code, type, layout
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
                .push_bind(&card.type_line)
                .push_bind(&card.layout);
        });
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
            type = EXCLUDED.type,
            layout = EXCLUDED.layout
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
            card.type IS DISTINCT FROM EXCLUDED.type OR
            card.layout IS DISTINCT FROM EXCLUDED.layout",
        );
        match self.db.execute_query_builder(query_builder).await {
            Ok(rows_affected) => Ok(rows_affected),
            Err(e) => {
                error!("Failed to save {} cards: {}", cards.len(), e);
                Err(e)
            }
        }
    }

    pub async fn save_legalities(&self, cards: &[Card]) -> Result<u64> {
        let card_ids: Vec<String> = cards.iter().map(|c| c.id.clone()).collect();
        if card_ids.is_empty() {
            return Ok(0);
        }
        let legalities: Vec<_> = cards.iter().flat_map(|c| c.legalities.clone()).collect();
        if legalities.is_empty() {
            let mut delete_qb = QueryBuilder::new("DELETE FROM legality WHERE card_id = ANY(");
            delete_qb.push_bind(card_ids);
            delete_qb.push(")");
            return self.db.execute_query_builder(delete_qb).await;
        }
        let mut delete_qb = QueryBuilder::new("DELETE FROM legality WHERE card_id = ANY(");
        delete_qb.push_bind(card_ids.clone());
        delete_qb.push(")");
        self.db.execute_query_builder(delete_qb).await?;
        let mut ids: Vec<String> = Vec::with_capacity(legalities.len());
        let mut formats: Vec<String> = Vec::with_capacity(legalities.len());
        let mut statuses: Vec<String> = Vec::with_capacity(legalities.len());
        for l in &legalities {
            ids.push(l.card_id.clone());
            formats.push(l.format.to_string());
            statuses.push(l.status.to_string());
        }
        let mut qb = QueryBuilder::new(
            "INSERT INTO legality (card_id, format, status) \
             SELECT u.card_id, u.format::format_enum, u.status::legality_status_enum \
             FROM UNNEST(",
        );
        qb.push_bind(ids);
        qb.push(", ");
        qb.push_bind(formats);
        qb.push(", ");
        qb.push_bind(statuses);
        qb.push(") AS u(card_id, format, status) JOIN card c ON c.id = u.card_id");

        let inserted = self.db.execute_query_builder(qb).await?;
        Ok(inserted)
    }

    pub async fn count(&self) -> Result<u64> {
        let count = self.db.count("SELECT COUNT(*) FROM card").await?;
        Ok(count as u64)
    }

    pub async fn legality_count(&self) -> Result<u64> {
        let count = self.db.count("SELECT COUNT(*) FROM legality").await?;
        Ok(count as u64)
    }

    pub async fn set_exists(&self, code: &str) -> Result<bool> {
        if code.is_empty() {
            return Ok(false);
        }
        let exists = self.db.row_exists("set", "code", code).await?;
        Ok(exists)
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

    pub async fn delete_set_and_dependents(&self, set_code: &str, batch_size: i64) -> Result<u64> {
        if set_code.is_empty() {
            return Ok(0);
        }
        let mut total_deleted = 0u64;
        loop {
            let mut qb = QueryBuilder::new("WITH to_del AS (SELECT id FROM card WHERE set_code = ");
            qb.push_bind(set_code);
            qb.push(" LIMIT ");
            qb.push_bind(batch_size);
            qb.push(") DELETE FROM legality WHERE card_id IN (SELECT id FROM to_del)");
            let deleted = self.db.execute_query_builder(qb).await?;
            total_deleted += deleted;
            if deleted == 0 {
                break;
            }
        }
        loop {
            let mut qb = QueryBuilder::new("WITH to_del AS (SELECT id FROM card WHERE set_code = ");
            qb.push_bind(set_code);
            qb.push(" LIMIT ");
            qb.push_bind(batch_size);
            qb.push(") DELETE FROM price WHERE card_id IN (SELECT id FROM to_del)");
            let deleted = self.db.execute_query_builder(qb).await?;
            total_deleted += deleted;
            if deleted == 0 {
                break;
            }
        }
        loop {
            let mut qb = QueryBuilder::new("WITH to_del AS (SELECT id FROM card WHERE set_code = ");
            qb.push_bind(set_code);
            qb.push(" LIMIT ");
            qb.push_bind(batch_size);
            qb.push(") DELETE FROM inventory WHERE card_id IN (SELECT id FROM to_del)");
            let deleted = self.db.execute_query_builder(qb).await?;
            total_deleted += deleted;
            if deleted == 0 {
                break;
            }
        }
        loop {
            let mut qb = QueryBuilder::new("WITH to_del AS (SELECT id FROM card WHERE set_code = ");
            qb.push_bind(set_code);
            qb.push(" LIMIT ");
            qb.push_bind(batch_size);
            qb.push(") DELETE FROM card WHERE id IN (SELECT id FROM to_del)");
            let deleted = self.db.execute_query_builder(qb).await?;
            total_deleted += deleted;
            if deleted == 0 {
                break;
            }
        }
        let mut qb = QueryBuilder::new("DELETE FROM \"set\" WHERE code = ");
        qb.push_bind(set_code);
        let deleted = self.db.execute_query_builder(qb).await?;
        total_deleted += deleted;
        info!("Deleted {} rows for set {}", total_deleted, set_code);
        Ok(total_deleted)
    }

    pub async fn delete_cards_by_ids_batched(
        &self,
        ids: &[String],
        batch_size: i64,
    ) -> Result<u64> {
        if ids.is_empty() {
            return Ok(0);
        }
        let mut total_deleted = 0u64;
        for chunk in ids.chunks(batch_size as usize) {
            let mut qb = QueryBuilder::new("DELETE FROM legality WHERE card_id = ANY(");
            qb.push_bind(chunk.to_vec());
            qb.push(")");
            total_deleted += self.db.execute_query_builder(qb).await?;
            let mut qb = QueryBuilder::new("DELETE FROM price WHERE card_id = ANY(");
            qb.push_bind(chunk.to_vec());
            qb.push(")");
            total_deleted += self.db.execute_query_builder(qb).await?;
            let mut qb = QueryBuilder::new("DELETE FROM inventory WHERE card_id = ANY(");
            qb.push_bind(chunk.to_vec());
            qb.push(")");
            total_deleted += self.db.execute_query_builder(qb).await?;
            let mut qb = QueryBuilder::new("DELETE FROM card WHERE id = ANY(");
            qb.push_bind(chunk.to_vec());
            qb.push(")");
            total_deleted += self.db.execute_query_builder(qb).await?;
        }
        info!("Deleted {} rows for {} card ids", total_deleted, ids.len());
        Ok(total_deleted)
    }
}

use std::sync::Arc;
use anyhow::Result;
use chrono::Utc;
use sqlx::QueryBuilder;

use crate::database::ConnectionPool;

use super::models::Price;

#[derive(Clone)]
pub struct PriceRepository {
    db:  Arc<ConnectionPool>,
}

impl PriceRepository {
    pub fn new(db:  Arc<ConnectionPool>) -> Self {
        Self { db }
    }

    pub async fn fetch_batch(&self, batch_size: i16) -> Result<Vec<Price>> {
        let query = "SELECT id, card_id, foil, normal, date
                     FROM price 
                     ORDER BY id ASC 
                     LIMIT $1";

        self.db.fetch_all_with_param::<Price, i16>(query, batch_size).await
    }

    pub async fn bulk_insert(&self, prices: &[Price]) -> Result<u64> {
        if prices.is_empty() {
            return Ok(0);
        }

        let mut query_builder = QueryBuilder::new(
            "INSERT INTO price (card_id, foil, normal, date) ",
        );

        query_builder.push_values(prices, |mut b, price| {
            b.push_bind(&price.card_id)
                .push_bind(&price.foil)
                .push_bind(&price.normal)
                .push_bind(&price.date);
        });

        query_builder.push(" ON CONFLICT (card_id, date) DO UPDATE SET foil = EXCLUDED.foil, normal = EXCLUDED.normal");

        self.db.execute_query_builder(query_builder).await
    }

    pub async fn archive_to_history(&self, prices: &[Price]) -> Result<u64> {
        if prices.is_empty() {
            return Ok(0);
        }

        let mut query_builder = QueryBuilder::new(
            "INSERT INTO price_history (price_id, card_id, foil, normal, date, archived_at) ",
        );

        query_builder.push_values(prices, |mut b, price| {
            b.push_bind(&price.id)
                .push_bind(&price.card_id)
                .push_bind(&price.foil)
                .push_bind(&price.normal)
                .push_bind(&price.date)
                .push_bind(Utc::now());
        });

        query_builder.push(" ON CONFLICT (card_id, date) DO NOTHING");

        self.db.execute_query_builder(query_builder).await
    }

    pub async fn delete_by_ids(&self, price_ids: &[i64]) -> Result<u64> {
        if price_ids.is_empty() {
            return Ok(0);
        }

        let query = "DELETE FROM price WHERE id = ANY($1)";
        self.db.execute_query_with_param(query, price_ids).await
    }

    pub async fn count(&self) -> Result<i64> {
        let query = "SELECT COUNT(*) FROM price";
        self.db.count(query).await
    }

    pub async fn find_by_card_id(&self, card_id: i64) -> Result<Vec<Price>> {
        let query = "SELECT id, card_id, foil, normal, date, created_at, updated_at 
                     FROM price 
                     WHERE card_id = $1 
                     ORDER BY date DESC";

        self.db.fetch_all_with_param::<Price, i64>(query, card_id).await
    }

    pub async fn find_latest_for_card(&self, card_id: i64) -> Result<Option<Price>> {
        let query = "SELECT id, card_id, foil, normal, date, created_at, updated_at 
                     FROM price 
                     WHERE card_id = $1 
                     ORDER BY date DESC 
                     LIMIT 1";

        self.db.fetch_optional_with_param::<Price, i64>(query, card_id).await
    }
}
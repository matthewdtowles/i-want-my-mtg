use crate::database::ConnectionPool;
use crate::price::models::Price;
use anyhow::Result;
use sqlx::QueryBuilder;
use std::sync::Arc;
use tracing::{debug, error};

#[derive(Clone)]
pub struct PriceRepository {
    db: Arc<ConnectionPool>,
}

impl PriceRepository {
    pub fn new(db: Arc<ConnectionPool>) -> Self {
        Self { db }
    }

    pub async fn fetch_batch(&self, batch_size: i16) -> Result<Vec<Price>> {
        debug!("Fetch batch of size: {}", batch_size);
        let query = "SELECT id, card_id, foil, normal, date
                     FROM price 
                     ORDER BY id ASC 
                     LIMIT ";
        let mut query_builder = QueryBuilder::new(query);
        query_builder.push_bind(batch_size);
        self.db.fetch_all_query_builder(query_builder).await
    }

    pub async fn fetch_all_card_ids(&self) -> Result<std::collections::HashSet<String>> {
        let query = "SELECT id FROM card";
        let query_builder = QueryBuilder::new(query);
        let rows: Vec<(String,)> = self.db.fetch_all_query_builder(query_builder).await?;
        Ok(rows.into_iter().map(|(id,)| id).collect())
    }

    pub async fn count_prices(&self) -> Result<u64> {
        Ok(self.db.count("SELECT COUNT(*) FROM price").await? as u64)
    }

    pub async fn save(&self, prices: &[Price]) -> Result<u64> {
        if prices.is_empty() {
            return Ok(0);
        }
        let mut query_builder =
            QueryBuilder::new("INSERT INTO price (card_id, foil, normal, date) ");
        query_builder.push_values(prices, |mut b, price| {
            b.push_bind(&price.card_id)
                .push_bind(&price.foil)
                .push_bind(&price.normal)
                .push_bind(&price.date);
        });
        query_builder.push(
            " ON CONFLICT (card_id, date) DO UPDATE SET 
            foil = EXCLUDED.foil, 
            normal = EXCLUDED.normal",
        );
        match self.db.execute_query_builder(query_builder).await {
            Ok(count) => Ok(count),
            Err(e) => {
                error!("Database error: {:?}", e);
                Err(e.into())
            }
        }
    }

    pub async fn save_to_history(&self, prices: &[Price]) -> Result<Vec<i32>> {
        if prices.is_empty() {
            return Ok(vec![]);
        }
        let mut query_builder =
            QueryBuilder::new("INSERT INTO price_history (card_id, foil, normal, date) ");
        query_builder.push_values(prices, |mut b, price| {
            b.push_bind(&price.card_id)
                .push_bind(&price.foil)
                .push_bind(&price.normal)
                .push_bind(&price.date);
        });
        query_builder.push(" ON CONFLICT (card_id, date) DO NOTHING RETURNING id");
        match self
            .db
            .execute_query_builder_returning_ids(query_builder)
            .await
        {
            Ok(saved_ids) => Ok(saved_ids),
            Err(e) => {
                error!("Database error: {:?}", e);
                Err(e.into())
            }
        }
    }

    pub async fn delete_by_ids(&self, price_ids: &[i32]) -> Result<u64> {
        if price_ids.is_empty() {
            return Ok(0);
        }
        let query = "DELETE FROM price WHERE id IN (";
        let mut query_builder = QueryBuilder::new(query);
        let mut separated = query_builder.separated(", ");
        for id in price_ids {
            separated.push_bind(id);
        }
        separated.push_unseparated(")");
        debug!("Query: {}", query_builder.sql());
        self.db.execute_query_builder(query_builder).await
    }

    pub async fn delete_all(&self) -> Result<u64> {
        let query = "DELETE FROM price";
        let query_builder = QueryBuilder::new(query);
        self.db.execute_query_builder(query_builder).await
    }
}

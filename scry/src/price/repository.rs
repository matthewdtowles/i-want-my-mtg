use crate::database::ConnectionPool;
use crate::price::models::Price;
use anyhow::Result;
use chrono::NaiveDate;
use sqlx::QueryBuilder;
use std::sync::Arc;
use tracing::error;

#[derive(Clone)]
pub struct PriceRepository {
    db: Arc<ConnectionPool>,
}

impl PriceRepository {
    const PRICE_TABLE: &str = "price";
    const PRICE_HISTORY_TABLE: &str = "price_history";

    pub fn new(db: Arc<ConnectionPool>) -> Self {
        Self { db }
    }

    pub async fn price_count(&self) -> Result<u64> {
        self.count(Self::PRICE_TABLE).await
    }

    pub async fn price_history_count(&self) -> Result<u64> {
        self.count(Self::PRICE_HISTORY_TABLE).await
    }

    pub async fn fetch_all_card_ids(&self) -> Result<std::collections::HashSet<String>> {
        let query = "SELECT id FROM card";
        let query_builder = QueryBuilder::new(query);
        let rows: Vec<(String,)> = self.db.fetch_all_query_builder(query_builder).await?;
        Ok(rows.into_iter().map(|(id,)| id).collect())
    }

    pub async fn fetch_price_dates(&self) -> Result<Vec<NaiveDate>> {
        let query = format!("SELECT DISTINCT(date) FROM {} ORDER BY date DESC", Self::PRICE_TABLE);
        let query_builder = QueryBuilder::new(query);
        let rows: Vec<(NaiveDate,)> = self.db.fetch_all_query_builder(query_builder).await?;
        Ok(rows.into_iter().map(|(date,)| date).collect())
    }

    pub async fn save_prices(&self, prices: &[Price]) -> Result<u64> {
        self.save(prices, Self::PRICE_TABLE).await
    }

    pub async fn save_price_history(&self, prices: &[Price]) -> Result<u64> {
        self.save(prices, Self::PRICE_HISTORY_TABLE).await
    }

    pub async fn delete_all(&self) -> Result<u64> {
        let query = format!("DELETE FROM {}", Self::PRICE_TABLE);
        let query_builder = QueryBuilder::new(query);
        self.db.execute_query_builder(query_builder).await
    }

    pub async fn delete_by_date(&self, date: NaiveDate) -> Result<u64> {
        let query = format!("DELETE FROM {} WHERE date = ", Self::PRICE_TABLE);
        let mut query_builder = QueryBuilder::new(query);
        query_builder.push_bind(date);
        self.db.execute_query_builder(query_builder).await
    }

    async fn save(&self, prices: &[Price], table: &str) -> Result<u64> {
        if prices.is_empty() {
            return Ok(0);
        }
        let query = format!("INSERT INTO {} (card_id, foil, normal, date) ", table);
        let mut query_builder = QueryBuilder::new(query);
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

    async fn count(&self, table: &str) -> Result<u64> {
        let query = format!("SELECT COUNT(*) FROM {}", table);
        let count = self.db.count(query.as_str()).await?;
        Ok(count as u64)
    }
}

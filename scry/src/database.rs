use crate::config::Config;
use anyhow::Result;
use sqlx::{postgres::PgPoolOptions, PgPool, QueryBuilder, Row};
use std::sync::Arc;

#[derive(Clone)]
pub struct ConnectionPool {
    pool: Arc<PgPool>,
}

impl ConnectionPool {
    pub async fn new(config: &Config) -> Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(config.max_pool_size)
            .connect(&config.database_url)
            .await?;

        Ok(Self {
            pool: Arc::new(pool),
        })
    }

    pub async fn execute_query_builder(
        &self,
        mut builder: QueryBuilder<'_, sqlx::Postgres>,
    ) -> Result<u64> {
        let result = builder.build().execute(&*self.pool).await?;
        Ok(result.rows_affected())
    }

    pub async fn count(&self, query: &str) -> Result<i64> {
        let row = sqlx::query(query).fetch_one(&*self.pool).await?;
        let count: i64 = row.get(0);
        Ok(count)
    }

    pub async fn count_with_param<T>(&self, query: &str, param: T) -> Result<i64>
    where
        T: Send + for<'q> sqlx::Encode<'q, sqlx::Postgres> + sqlx::Type<sqlx::Postgres>,
    {
        let row = sqlx::query(query)
            .bind(param)
            .fetch_one(&*self.pool)
            .await?;
        let count: i64 = row.get(0);
        Ok(count)
    }
}

use crate::config::Config;
use anyhow::Result;
use sqlx::{postgres::PgPoolOptions, FromRow, PgPool, QueryBuilder, Row};
use std::sync::Arc;

#[derive(Clone)]
pub struct DatabaseService {
    pool: Arc<PgPool>,
}

impl DatabaseService {
    pub async fn new(config: &Config) -> Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(config.max_pool_size)
            .connect(&config.database_url)
            .await?;

        Ok(Self {
            pool: Arc::new(pool),
        })
    }

    pub async fn health_check(&self) -> Result<()> {
        sqlx::query("SELECT 1").execute(&*self.pool).await?;
        Ok(())
    }

    // Execute a query that returns affected rows
    pub async fn execute_query(&self, query: &str) -> Result<u64> {
        let result = sqlx::query(query).execute(&*self.pool).await?;
        Ok(result.rows_affected())
    }

    // Execute a query with a single parameter
    pub async fn execute_query_with_param<T>(&self, query: &str, param: T) -> Result<u64>
    where
        T: Send + for<'q> sqlx::Encode<'q, sqlx::Postgres> + sqlx::Type<sqlx::Postgres>,
    {
        let result = sqlx::query(query).bind(param).execute(&*self.pool).await?;
        Ok(result.rows_affected())
    }

    // Fetch one result
    pub async fn fetch_one<T>(&self, query: &str) -> Result<T>
    where
        T: for<'r> FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
    {
        let result = sqlx::query_as::<_, T>(query).fetch_one(&*self.pool).await?;
        Ok(result)
    }

    // Fetch one result with a parameter
    pub async fn fetch_one_with_param<T, P>(&self, query: &str, param: P) -> Result<T>
    where
        T: for<'r> FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
        P: Send + for<'q> sqlx::Encode<'q, sqlx::Postgres> + sqlx::Type<sqlx::Postgres>,
    {
        let result = sqlx::query_as::<_, T>(query)
            .bind(param)
            .fetch_one(&*self.pool)
            .await?;
        Ok(result)
    }

    // Fetch all results
    pub async fn fetch_all<T>(&self, query: &str) -> Result<Vec<T>>
    where
        T: for<'r> FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
    {
        let result = sqlx::query_as::<_, T>(query).fetch_all(&*self.pool).await?;
        Ok(result)
    }

    // Fetch all results with a parameter
    pub async fn fetch_all_with_param<T, P>(&self, query: &str, param: P) -> Result<Vec<T>>
    where
        T: for<'r> FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
        P: Send + for<'q> sqlx::Encode<'q, sqlx::Postgres> + sqlx::Type<sqlx::Postgres>,
    {
        let result = sqlx::query_as::<_, T>(query)
            .bind(param)
            .fetch_all(&*self.pool)
            .await?;
        Ok(result)
    }

    // Fetch optional result
    pub async fn fetch_optional<T>(&self, query: &str) -> Result<Option<T>>
    where
        T: for<'r> FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
    {
        let result = sqlx::query_as::<_, T>(query)
            .fetch_optional(&*self.pool)
            .await?;
        Ok(result)
    }

    // Fetch optional result with a parameter
    pub async fn fetch_optional_with_param<T, P>(&self, query: &str, param: P) -> Result<Option<T>>
    where
        T: for<'r> FromRow<'r, sqlx::postgres::PgRow> + Send + Unpin,
        P: Send + for<'q> sqlx::Encode<'q, sqlx::Postgres> + sqlx::Type<sqlx::Postgres>,
    {
        let result = sqlx::query_as::<_, T>(query)
            .bind(param)
            .fetch_optional(&*self.pool)
            .await?;
        Ok(result)
    }

    // For complex queries that need QueryBuilder
    pub async fn execute_query_builder(
        &self,
        mut builder: QueryBuilder<'_, sqlx::Postgres>,
    ) -> Result<u64> {
        let result = builder.build().execute(&*self.pool).await?;
        Ok(result.rows_affected())
    }

    // Count query - returns a single number
    pub async fn count(&self, query: &str) -> Result<i64> {
        let row = sqlx::query(query).fetch_one(&*self.pool).await?;
        let count: i64 = row.get(0);
        Ok(count)
    }

    // Count query with parameter
    pub async fn count_with_param<P>(&self, query: &str, param: P) -> Result<i64>
    where
        P: Send + for<'q> sqlx::Encode<'q, sqlx::Postgres> + sqlx::Type<sqlx::Postgres>,
    {
        let row = sqlx::query(query)
            .bind(param)
            .fetch_one(&*self.pool)
            .await?;
        let count: i64 = row.get(0);
        Ok(count)
    }

    // Additional helper methods for common patterns

    // Execute multiple queries in a transaction
    pub async fn execute_transaction<F, R>(&self, transaction_fn: F) -> Result<R>
    where
        F: for<'c> FnOnce(&'c mut sqlx::Transaction<'_, sqlx::Postgres>) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<R>> + Send + 'c>>,
        R: Send,
    {
        let mut tx = self.pool.begin().await?;
        let result = transaction_fn(&mut tx).await?;
        tx.commit().await?;
        Ok(result)
    }

    // Get a direct reference to the pool for advanced usage
    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    // Execute multiple statements (useful for migrations/setup)
    pub async fn execute_batch(&self, queries: &[&str]) -> Result<Vec<u64>> {
        let mut results = Vec::new();
        
        for query in queries {
            let result = sqlx::query(query).execute(&*self.pool).await?;
            results.push(result.rows_affected());
        }
        
        Ok(results)
    }

    // Bulk execute with parameters (useful for batch inserts with different data)
    pub async fn execute_batch_with_params<T>(&self, query: &str, params: Vec<T>) -> Result<u64>
    where
        T: Send + for<'q> sqlx::Encode<'q, sqlx::Postgres> + sqlx::Type<sqlx::Postgres>,
    {
        let mut total_affected = 0;
        
        for param in params {
            let result = sqlx::query(query).bind(param).execute(&*self.pool).await?;
            total_affected += result.rows_affected();
        }
        
        Ok(total_affected)
    }
}

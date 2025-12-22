use crate::price::event_processor::PriceEventProcessor;
use crate::price::models::Price;
use crate::price::repository::PriceRepository;
use crate::utils::JsonStreamParser;
use crate::{database::ConnectionPool, utils::http_client::HttpClient};
use anyhow::Result;
use chrono::{Duration, NaiveDate, Timelike};
use chrono_tz::America::New_York;
use rust_decimal::Decimal;
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{debug, info, warn};

const BATCH_SIZE: usize = 500;

pub struct PriceService {
    client: Arc<HttpClient>,
    repository: PriceRepository,
}

impl PriceService {
    pub fn new(db: Arc<ConnectionPool>, http_client: Arc<HttpClient>) -> Self {
        Self {
            client: http_client,
            repository: PriceRepository::new(db),
        }
    }

    pub async fn fetch_prices_for_card_ids(
        &self,
        card_ids: &[String],
    ) -> Result<HashMap<String, (Option<Decimal>, Option<Decimal>)>> {
        self.repository.fetch_prices_for_card_ids(card_ids).await
    }

    /// This is meant to update only if null
    /// Used to help merge split foil and normal cards
    pub async fn update_price_foil_if_null(
        &self,
        card_id: &str,
        new_foil: &Decimal,
    ) -> Result<i64> {
        self.repository
            .update_price_foil_if_null(card_id, new_foil)
            .await
    }

    pub async fn insert_price_for_card(
        &self,
        card_id: &str,
        normal: Option<Decimal>,
        foil: Option<Decimal>,
    ) -> Result<i64> {
        self.repository
            .insert_price_for_card(card_id, normal, foil)
            .await
    }

    pub async fn fetch_price_count(&self) -> Result<i64> {
        self.repository.price_count().await
    }

    pub async fn fetch_price_history_count(&self) -> Result<i64> {
        self.repository.price_history_count().await
    }

    pub async fn ingest_all_today(&self) -> Result<()> {
        debug!("Start ingestion of all prices");
        let byte_stream = self.client.all_today_prices_stream().await?;
        debug!("Received byte stream for today's prices.");
        let valid_card_ids = self.repository.fetch_all_card_ids().await?;

        let card_foil_status = self
            .repository
            .fetch_card_foil_status(&valid_card_ids)
            .await?;

        let mut event_processor = PriceEventProcessor::new(BATCH_SIZE);
        event_processor.set_card_foil_status(card_foil_status);

        let mut json_stream_parser = JsonStreamParser::new(event_processor);
        json_stream_parser
            .parse_stream(byte_stream, |batch| {
                Box::pin(self.save_prices(batch, &valid_card_ids))
            })
            .await?;
        Ok(())
    }

    pub async fn delete_all(&self) -> Result<i64> {
        info!("Deleting all prices.");
        self.repository.delete_all().await
    }

    /// Remove all old prices from db
    pub async fn clean_up_prices(&self) -> Result<()> {
        let mut price_dates = self.repository.fetch_price_dates().await?;
        if price_dates.is_empty() {
            warn!("No dates found in price table.");
            return Ok(());
        }
        if let Some(max_date) = price_dates.iter().max() {
            let max_date = max_date.clone();
            price_dates.retain(|d| d != &max_date);
        }
        if price_dates.is_empty() {
            info!("No old prices found in price table.");
            return Ok(());
        }
        for d in price_dates {
            self.repository.delete_by_date(d).await?;
        }
        Ok(())
    }

    pub async fn prices_are_current(&self) -> Result<bool> {
        let price_dates = self.repository.fetch_price_dates().await?;
        let expected_date = self.expected_latest_available_date()?;
        Ok(price_dates.iter().max().map(|d| *d) == Some(expected_date))
    }

    pub fn expected_latest_available_date(&self) -> Result<NaiveDate> {
        let est_now = chrono::Utc::now().with_timezone(&New_York);
        let est_hour = 10;
        if est_now.hour() >= est_hour {
            return Ok(est_now.date_naive());
        }
        Ok(est_now.date_naive() - Duration::days(1))
    }

    async fn save_prices(
        &self,
        prices: Vec<Price>,
        valid_card_ids: &std::collections::HashSet<String>,
    ) -> Result<()> {
        let filtered_prices: Vec<Price> = prices
            .into_iter()
            .filter(|p| valid_card_ids.contains(&p.card_id))
            .collect();
        if !filtered_prices.is_empty() {
            let saved_count = self.repository.save_prices(&filtered_prices).await?;
            debug!("Saved batch of {} prices to price table.", saved_count);
            let history_count = self.repository.save_price_history(&filtered_prices).await?;
            debug!("Saved batch of {} prices to history table.", history_count);
        }
        Ok(())
    }
}

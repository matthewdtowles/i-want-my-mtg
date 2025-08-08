use crate::price::models::Price;
use crate::price::repository::PriceRepository;
use crate::price::stream_parser::PriceStreamParser;
use crate::{database::ConnectionPool, utils::http_client::HttpClient};
use actson::tokio::AsyncBufReaderJsonFeeder;
use actson::{JsonEvent, JsonParser};
use anyhow::Result;
use chrono::{Duration, NaiveDate, Timelike};
use chrono_tz::America::New_York;
use futures::StreamExt;
use std::sync::Arc;
use tokio::io::BufReader;
use tokio_util::io::StreamReader;
use tracing::{debug, error, info, warn};

const BATCH_SIZE: usize = 500;
const BUF_READER_SIZE: usize = 64 * 1024;

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

    pub async fn ingest_all_today(&self) -> Result<u64> {
        let url_path = "AllPricesToday.json";
        debug!("Start ingestion of all prices");
        let byte_stream = self.client.get_bytes_stream(url_path).await?;
        debug!("Received byte stream for: {}", url_path);
        let stream_reader =
            StreamReader::new(byte_stream.map(|result| {
                result.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
            }));
        let mut buf_reader = BufReader::with_capacity(BUF_READER_SIZE, stream_reader);
        let mut feeder = AsyncBufReaderJsonFeeder::new(&mut buf_reader);
        let mut parser = JsonParser::new(&mut feeder);
        let mut stream_parser = PriceStreamParser::new(BATCH_SIZE);
        let mut total_processed = 0u64;
        let mut total_processed_history = 0u64;
        let mut error_count = 0;
        // At startup, fetch all valid card IDs
        let valid_card_ids: std::collections::HashSet<String> =
            self.repository.fetch_all_card_ids().await?;
        loop {
            let mut event = parser.next_event();
            if event == JsonEvent::NeedMoreInput {
                let mut fill_attempts = 0;
                loop {
                    match parser.feeder.fill_buf().await {
                        Ok(()) => {
                            fill_attempts += 1;
                            if fill_attempts >= 3 {
                                break;
                            }
                            continue;
                        }
                        Err(e) => {
                            if fill_attempts == 0 {
                                error!("Failed to fill buffer: {}", e);
                            }
                            break;
                        }
                    }
                }
                event = parser.next_event();
            }
            match event {
                JsonEvent::Eof => {
                    debug!("Reached end of all prices JSON file.");
                    let remaining_prices = stream_parser.take_batch();
                    if !remaining_prices.is_empty() {
                        debug!("Saving final batch of {} prices", remaining_prices.len());
                        // Filter out prices with missing card_id
                        let filtered_prices: Vec<Price> = remaining_prices
                            .into_iter()
                            .filter(|p| valid_card_ids.contains(&p.card_id))
                            .collect();

                        if !filtered_prices.is_empty() {
                            let final_count = self.repository.save_prices(&filtered_prices).await?;
                            total_processed += final_count;
                            let final_count_history =
                                self.repository.save_price_history(&filtered_prices).await?;
                            total_processed_history += final_count_history;
                        }
                    }
                    info!("Total prices saved: {}", total_processed);
                    info!("Total prices saved to history: {}", total_processed_history);
                    return Ok(total_processed);
                }
                JsonEvent::Error => {
                    warn!("JSON parser error at depth {}", stream_parser.json_depth(),);
                    error_count += 1;
                    if error_count > 10 {
                        error!("Parser error limit (10) exceeded. Aborting stream.");
                        return Err(anyhow::anyhow!(
                            "Streaming parse failed due to parser errors"
                        ));
                    }
                    continue;
                }
                JsonEvent::NeedMoreInput => {
                    debug!("JSON parser needs more input...");
                    continue;
                }
                _ => {
                    error_count = 0;
                    let processed_count = stream_parser.process_event(event, &parser).await?;
                    if processed_count > 0 {
                        let prices = stream_parser.take_batch();
                        if !prices.is_empty() {
                            // Filter out prices with missing card_id
                            let filtered_prices: Vec<Price> = prices
                                .into_iter()
                                .filter(|p| valid_card_ids.contains(&p.card_id))
                                .collect();

                            if !filtered_prices.is_empty() {
                                let saved_count =
                                    self.repository.save_prices(&filtered_prices).await?;
                                total_processed += saved_count;
                                info!("Total prices processed {}", total_processed);
                                let final_count_history =
                                    self.repository.save_price_history(&filtered_prices).await?;
                                total_processed_history += final_count_history;
                            }
                        }
                    }
                }
            }
        }
    }

    pub async fn delete_all(&self) -> Result<u64> {
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
}

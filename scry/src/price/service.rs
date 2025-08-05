use crate::price::models::Price;
use crate::price::repository::PriceRepository;
use crate::price::stream_parser::PriceStreamParser;
use crate::{database::ConnectionPool, utils::http_client::HttpClient};
use actson::tokio::AsyncBufReaderJsonFeeder;
use actson::{JsonEvent, JsonParser};
use anyhow::Result;
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
                            let final_count = self.repository.save(&filtered_prices).await?;
                            total_processed += final_count;
                        }
                    }
                    info!("Total prices saved: {}", total_processed);
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
                                let saved_count = self.repository.save(&filtered_prices).await?;
                                total_processed += saved_count;
                                info!("Processed {} prices so far...", total_processed);
                            }
                        }
                    }
                }
            }
        }
    }

    pub async fn archive(&self) -> Result<u64> {
        debug!("Starting price archival");
        let mut archived_count = 0;
        let mut attempts = 0;
        let prices_count = self.repository.count_prices().await?;
        info!(
            "Total prices in Price table before archival: {}",
            prices_count
        );
        loop {
            let prices = self.repository.fetch_batch(BATCH_SIZE as i16).await?;
            debug!("Obtained {} prices from Price table.", prices.len());
            if prices.is_empty() {
                warn!("No prices to archive");
                break;
            }
            attempts += 1;

            let saved_card_ids = self.repository.save_to_history(&prices).await?;
            debug!(
                "Total saved in Price History table: {}",
                saved_card_ids.len()
            );
            if saved_card_ids.len() != prices.len() {
                warn!(
                    "Expected {} prices to be archived, but {} were archived in batch.",
                    prices.len(),
                    saved_card_ids.len()
                );
            }
            let total_deleted = self.repository.delete_by_card_ids(&saved_card_ids).await?;
            debug!("Total deleted from `price` table: {}", total_deleted);
            if total_deleted > 0 {
                attempts = 0;
            }
            archived_count += total_deleted;
            if attempts > 3 {
                warn!("Error archiving prices after 3 attempts.");
                break;
            }
        }
        info!("Total Prices at Start: {}", prices_count);
        info!("Total Archived to Price History: {}", archived_count);
        Ok(archived_count)
    }

    pub async fn delete_all(&self) -> Result<u64> {
        info!("Deleting all prices.");
        self.repository.delete_all().await
    }
}

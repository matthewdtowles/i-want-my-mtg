use crate::price::models::Price;
use crate::price::{mapper::PriceMapper, repository::PriceRepository};
use crate::{database::ConnectionPool, utils::http_client::HttpClient};
use actson::tokio::AsyncBufReaderJsonFeeder;
use actson::{JsonEvent, JsonParser};
use anyhow::Result;
use futures::StreamExt;
use std::os::unix::process;
use std::sync::Arc;
use tokio::io::BufReader;
use tokio_util::io::StreamReader;
use tracing::{debug, error, info, warn};

const BATCH_SIZE: usize = 500;

pub struct PriceService {
    client: HttpClient,
    repository: PriceRepository,
}

impl PriceService {
    pub fn new(db: Arc<ConnectionPool>, http_client: HttpClient) -> Self {
        Self {
            client: http_client,
            repository: PriceRepository::new(db),
        }
    }

    pub async fn ingest_all_today(&self) -> Result<u64> {
        let url_path = "AllPricesToday.json";
        info!("Start ingestion of all prices");
        let byte_stream = self.client.get_bytes_stream(url_path).await?;
        debug!("Received byte stream for: {}", url_path);

        let stream_reader =
            StreamReader::new(byte_stream.map(|result| {
                result.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
            }));

        let mut buf_reader = BufReader::with_capacity(64 * 1024, stream_reader);
        let mut feeder = AsyncBufReaderJsonFeeder::new(&mut buf_reader);
        let mut parser = JsonParser::new(&mut feeder);
        let mut price_processor = PriceProcessor::new(BATCH_SIZE); // TODO: impl
        let mut total_processed = 0u64;
        let mut error_count = 0;
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
                    let remaining_prices = price_processor.take_remaining();
                    if !remaining_prices.is_empty() {
                        debug!("Saving final batch of {} prices", remaining_prices.len());
                        let final_count = self.repository.save(&remaining_prices).await?;
                        total_processed += final_count;
                    }
                    info!("Total prices saved: {}", total_processed);
                    return Ok(total_processed);
                }
                JsonEvent::Error => {
                    warn!(
                        "JSON parser error at depth {} on path {}",
                        price_processor.json_depth,
                        price_processor.json_path.join("/")
                    );
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
                    continue;
                }
                _ => {
                    error_count = 0;
                    let processed_count = price_processor.process_event(event, &parser).await?;
                    if processed_count > 0 {
                        let prices = price_processor.take_batch();
                        if !prices.is_empty() {
                            let saved_count = self.repository.save(&prices).await?;
                            total_processed += saved_count;
                            if total_processed > 0 && total_processed % 5000 == 0 {
                                info!("Processed {} prices so far...", total_processed);
                            }
                        }
                    }
                }
            }
        }
    }

    pub async fn archive(&self) -> Result<u64> {
        info!("Starting price archival");
        let mut archived_count = 0;
        loop {
            // read prices from price table
            let prices = self.repository.fetch_batch(BATCH_SIZE as i16).await?;
            if prices.is_empty() {
                // while prices is not empty
                info!("No prices to archive");
                break;
            }
            // insert into price_history table, return inserted ids
            let saved_ids = self.repository.save_to_history(&prices).await?;
            // check if any prices were missed in saved_ids
            // TODO: above
            // delete from price table
            archived_count += self.repository.delete_by_ids(&saved_ids).await?;
            archived_count += saved_ids.len() as u64;
            if archived_count != prices.len() as u64 {
                warn!(
                    "Some prices were not archived, expected: {}, archived: {}",
                    prices.len(),
                    archived_count
                );
            }
        }
        info!("Archived {} total prices", archived_count);
        Ok(archived_count)
    }

    pub async fn delete_all(&self) -> Result<u64> {
        info!("Deleting all prices.");
        self.repository.delete_all().await
    }
}

struct PriceProcessor {
    state: PriceParsingState,
    batch: Vec<Price>,
    batch_size: usize,
    card_price_depth: usize,
    current_price_json: String,
    in_card_price: bool,
    json_depth: usize,
    json_path: Vec<String>,
    prices_entered: usize,
    prices_processed: usize,
    prices_with_paper: usize,
    prices_without_paper: usize,
}

#[derive(Debug, Clone, PartialEq)]
enum PriceParsingState {
    Root,
    InCardPrice,
    SkippingValue(usize),
}

impl PriceProcessor {
    fn new(batch_size: usize) -> Self {
        Self {
            state: PriceParsingState::Root,
            batch: Vec::with_capacity(batch_size),
            batch_size,
            card_price_depth: 0,
            current_price_json: String::new(),
            in_card_price: false,
            json_depth: 0,
            json_path: Vec::new(),
            prices_entered: 0,
            prices_processed: 0,
            prices_with_paper: 0,
            prices_without_paper: 0,
        }
    }

    async fn process_event<R: tokio::io::AsyncRead + Unpin>(
        &mut self,
        event: JsonEvent,
        parser: &JsonParser<'_, AsyncBufReaderJsonFeeder<'_, R>>,
    ) -> Result<usize> {
        if let PriceParsingState::SkippingValue(skip_depth) = self.state {
            match event {
                JsonEvent::StartObject | JsonEvent::StartArray => {
                    self.json_depth += 1;
                }
                JsonEvent::EndObject | JsonEvent::EndArray => {
                    self.json_depth -= 1;
                    if self.json_depth <= skip_depth {
                        self.state = PriceParsingState::Root;
                        if !self.json_path.is_empty() {
                            let popped = self.json_path.pop();
                            debug!(
                                "Exited skip mode, popped: {:?}, new path len: {:?}",
                                popped,
                                self.json_path.len()
                            );
                        }
                    }
                }
                _ => {}
            }
        }
        return Ok(0);
    }
}

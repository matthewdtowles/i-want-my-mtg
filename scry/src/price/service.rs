use crate::price::models::Price;
use crate::price::repository::PriceRepository;
use crate::{database::ConnectionPool, utils::http_client::HttpClient};
use actson::tokio::AsyncBufReaderJsonFeeder;
use actson::{JsonEvent, JsonParser};
use anyhow::Result;
use chrono::NaiveDate;
use futures::StreamExt;
use rust_decimal::prelude::FromPrimitive;
use rust_decimal::Decimal;
use std::sync::Arc;
use tokio::io::BufReader;
use tokio_util::io::StreamReader;
use tracing::{debug, error, info, warn};

const BATCH_SIZE: usize = 500;
const ALLOWED_PROVIDERS: &[&str] = &["tcgplayer", "cardkingdom", "cardsphere"];

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
        let mut buf_reader = BufReader::with_capacity(64 * 1024, stream_reader);
        let mut feeder = AsyncBufReaderJsonFeeder::new(&mut buf_reader);
        let mut parser = JsonParser::new(&mut feeder);
        let mut price_processor = PriceProcessor::new(BATCH_SIZE);
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
                    let remaining_prices = price_processor.take_remaining();
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
                            info!("Processed {} prices so far...", total_processed);
                        }
                    }
                    info!("Total prices saved: {}", total_processed);
                    return Ok(total_processed);
                }
                JsonEvent::Error => {
                    warn!("JSON parser error at depth {}", price_processor.json_depth,);
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
                    let processed_count = price_processor.process_event(event, &parser).await?;
                    if processed_count > 0 {
                        let prices = price_processor.take_batch();
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
        return Ok(0);
        // let mut archived_count = 0;
        // loop {
        //     // read prices from price table
        //     let prices = self.repository.fetch_batch(BATCH_SIZE as i16).await?;
        //     if prices.is_empty() {
        //         // while prices is not empty
        //         info!("No prices to archive");
        //         break;
        //     }
        //     // insert into price_history table, return inserted ids
        //     let saved_ids = self.repository.save_to_history(&prices).await?;
        //     // check if any prices were missed in saved_ids
        //     // TODO: above
        //     // delete from price table
        //     archived_count += self.repository.delete_by_ids(&saved_ids).await?;
        //     archived_count += saved_ids.len() as u64;
        //     if archived_count != prices.len() as u64 {
        //         warn!(
        //             "Some prices were not archived, expected: {}, archived: {}",
        //             prices.len(),
        //             archived_count
        //         );
        //     }
        // }
        // info!("Archived {} total prices", archived_count);
        // Ok(archived_count)
    }

    pub async fn delete_all(&self) -> Result<u64> {
        info!("Deleting all prices.");
        self.repository.delete_all().await
    }
}

struct PriceProcessor {
    batch: Vec<Price>,
    batch_size: usize,
    current_card_uuid: Option<String>,
    in_data_object: bool,
    json_depth: usize,
    accumulator: Option<PriceAccumulator>,
    path: Vec<String>, // Track current path in JSON
    provider_currencies: std::collections::HashMap<String, String>,
    expecting_currency_for_provider: Option<String>,
}

impl PriceProcessor {
    pub fn new(batch_size: usize) -> Self {
        Self {
            batch: Vec::with_capacity(batch_size),
            batch_size,
            current_card_uuid: None,
            in_data_object: false,
            json_depth: 0,
            accumulator: None,
            path: Vec::new(),
            provider_currencies: std::collections::HashMap::new(),
            expecting_currency_for_provider: None,
        }
    }

    pub async fn process_event<R: tokio::io::AsyncRead + Unpin>(
        &mut self,
        event: JsonEvent,
        parser: &JsonParser<'_, AsyncBufReaderJsonFeeder<'_, R>>, // Do not remove
    ) -> Result<usize> {
        match event {
            JsonEvent::StartObject => self.handle_start_object(),
            JsonEvent::EndObject => self.handle_end_object(),
            JsonEvent::FieldName => {
                let field_name = parser.current_string().unwrap_or_default();
                self.handle_field_name(field_name)
            }
            JsonEvent::ValueString => {
                let value = parser.current_string().unwrap_or_default();
                self.handle_value(value)
            }
            JsonEvent::ValueInt => {
                let value = parser.current_i64().unwrap_or(0).to_string();
                self.handle_value(value)
            }
            JsonEvent::ValueDouble => {
                let value = parser.current_f64().unwrap_or(0.0).to_string();
                self.handle_value(value)
            }
            JsonEvent::ValueTrue => self.handle_value("true".to_string()),
            JsonEvent::ValueFalse => self.handle_value("false".to_string()),
            JsonEvent::ValueNull => self.handle_value("null".to_string()),
            JsonEvent::StartArray => {
                self.json_depth += 1;
                Ok(0)
            }
            JsonEvent::EndArray => {
                self.json_depth -= 1;
                Ok(0)
            }
            JsonEvent::Error => Err(anyhow::anyhow!(
                "JSON parser error - streaming parse failed at chunk boundary"
            )),
            _ => Ok(0),
        }
    }

    fn handle_start_object(&mut self) -> Result<usize> {
        self.json_depth += 1;
        Ok(0)
    }

    fn handle_end_object(&mut self) -> Result<usize> {
        // If closing a card UUID object (depth 3), aggregate and push to batch
        if self.in_data_object && self.json_depth == 3 {
            if let (Some(card_uuid), Some(acc)) =
                (self.current_card_uuid.take(), self.accumulator.take())
            {
                let date = acc
                    .date
                    .as_ref()
                    .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok());
                let foil = acc.average_foil().map(|v| Decimal::from_f64(v)).flatten();
                let normal = acc.average_normal().map(|v| Decimal::from_f64(v)).flatten();

                if foil.is_some() || normal.is_some() {
                    let price = Price {
                        id: None,
                        card_id: card_uuid,
                        date: date.unwrap_or_else(|| NaiveDate::from_ymd_opt(1970, 1, 1).unwrap()),
                        foil,
                        normal,
                    };
                    self.batch.push(price);
                }
            }
            let processed = if self.batch.len() >= self.batch_size {
                self.batch.len()
            } else {
                0
            };
            self.json_depth -= 1;
            self.path.pop();
            return Ok(processed);
        }
        // If closing the "data" object (depth 2)
        if self.in_data_object && self.json_depth == 2 {
            self.in_data_object = false;
            self.path.pop();
        }
        self.json_depth -= 1;
        self.path.pop();
        Ok(0)
    }

    // path[0] data | meta
    // path[1] <card-uuid>
    // path[2] paper | mtgo
    // path[3] <provider name>
    // path[4] currency | retail
    // if currency -> value USD ?
    // if retail: path[5] foil | normal
    //              path[6] <yyyy-mm-dd> -> value
    fn handle_field_name(&mut self, field_name: String) -> Result<usize> {
        // Track "data" object
        if self.json_depth == 1 && field_name == "data" {
            self.in_data_object = true;
        } else if self.at_price_key() {
            self.current_card_uuid = Some(field_name.clone());
            self.accumulator = Some(PriceAccumulator::new());
            self.provider_currencies.clear();
        }
        // Track currency for provider
        if self.path.len() == 5 && self.path[2] == "paper" && field_name == "currency" {
            self.expecting_currency_for_provider = Some(self.path[3].clone());
        }
        self.path.push(field_name);
        Ok(0)
    }

    fn handle_value(&mut self, value: String) -> Result<usize> {
        // Track currency for provider
        if let Some(provider) = self.expecting_currency_for_provider.take() {
            self.provider_currencies.insert(provider, value.clone());
        }

        // Only aggregate if we're inside a card UUID object
        if let Some(acc) = self.accumulator.as_mut() {
            // Path: [data, <card-uuid>, paper, <provider>, retail, normal|foil, <date>]
            if self.path.len() == 7
                && self.path[0] == "data"
                && self.path[2] == "paper"
                && self.path[4] == "retail"
                && (self.path[5] == "normal" || self.path[5] == "foil")
            {
                let provider = &self.path[3];
                if ALLOWED_PROVIDERS.contains(&provider.as_str()) {
                    if let Ok(price) = value.parse::<f64>() {
                        if self.path[5] == "foil" {
                            acc.add_foil(price);
                            acc.date = Some(self.path[6].clone());
                        } else if self.path[5] == "normal" {
                            acc.add_normal(price);
                            acc.date = Some(self.path[6].clone());
                        }
                    }
                }
            }
        }
        // After value, pop the last path segment
        self.path.pop();
        Ok(0)
    }

    fn at_price_key(&self) -> bool {
        self.in_data_object && self.json_depth == 2
    }

    fn take_batch(&mut self) -> Vec<Price> {
        std::mem::take(&mut self.batch)
    }

    fn take_remaining(&mut self) -> Vec<Price> {
        std::mem::take(&mut self.batch)
    }
}

struct PriceAccumulator {
    foil_sum: f64,
    foil_count: usize,
    normal_sum: f64,
    normal_count: usize,
    date: Option<String>,
}

impl PriceAccumulator {
    fn new() -> Self {
        Self {
            foil_sum: 0.0,
            foil_count: 0,
            normal_sum: 0.0,
            normal_count: 0,
            date: None,
        }
    }

    fn add_foil(&mut self, value: f64) {
        self.foil_sum += value;
        self.foil_count += 1;
    }

    fn add_normal(&mut self, value: f64) {
        self.normal_sum += value;
        self.normal_count += 1;
    }

    fn average_foil(&self) -> Option<f64> {
        if self.foil_count > 0 {
            Some(self.foil_sum / self.foil_count as f64)
        } else {
            None
        }
    }

    fn average_normal(&self) -> Option<f64> {
        if self.normal_count > 0 {
            Some(self.normal_sum / self.normal_count as f64)
        } else {
            None
        }
    }
}

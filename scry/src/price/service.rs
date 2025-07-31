use crate::price::models::Price;
use crate::price::{mapper::PriceMapper, repository::PriceRepository};
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
        debug!("Starting price archival");
        return Ok(0)
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
    state: PriceParsingState,
    batch: Vec<Price>,
    batch_size: usize,
    current_card_uuid: Option<String>,
    current_price_json: String,
    in_data_object: bool,
    json_depth: usize,
}

#[derive(Debug, Clone, PartialEq)]
enum PriceParsingState {
    Root,
    InCardPrice,
}

impl PriceProcessor {
    pub fn new(batch_size: usize) -> Self {
        Self {
            state: PriceParsingState::Root,
            batch: Vec::with_capacity(batch_size),
            batch_size,
            current_card_uuid: None,
            current_price_json: String::new(),
            in_data_object: false,
            json_depth: 0,
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
                if self.in_price_object() {
                    let value = parser.current_string().unwrap_or_default();
                    return self.handle_string_value(value);
                }
                Ok(0)
            }
            // TODO: REFACTOR int, double, true, false, etc below:
            JsonEvent::ValueInt => {
                if self.in_data_object && self.json_depth >= 2 {
                    let value = parser
                        .current_i64()
                        .map(|v| v.to_string())
                        .unwrap_or_else(|_| "0".to_string());
                    self.current_price_json.push_str(&value);
                }
                Ok(0)
            }
            JsonEvent::ValueDouble => {
                if self.in_data_object && self.json_depth >= 2 {
                    let value = parser
                        .current_f64()
                        .map(|v| v.to_string())
                        .unwrap_or_else(|_| "0.0".to_string());
                    self.current_price_json.push_str(&value);
                }
                Ok(0)
            }
            JsonEvent::ValueTrue => {
                if self.in_data_object && self.json_depth >= 2 {
                    self.current_price_json.push_str("true");
                }
                Ok(0)
            }
            JsonEvent::ValueFalse => {
                if self.in_data_object && self.json_depth >= 2 {
                    self.current_price_json.push_str("false");
                }
                Ok(0)
            }
            JsonEvent::ValueNull => {
                if self.in_data_object && self.json_depth >= 2 {
                    self.current_price_json.push_str("null");
                }
                Ok(0)
            }
            JsonEvent::StartArray => {
                if self.in_data_object && self.json_depth >= 2 {
                    self.current_price_json.push('[');
                }
                self.json_depth += 1;
                Ok(0)
            }
            JsonEvent::EndArray => {
                if self.in_data_object && self.json_depth >= 2 {
                    self.current_price_json.push(']');
                }
                self.json_depth -= 1;
                Ok(0)
            }
            JsonEvent::Error => Err(anyhow::anyhow!(
                "JSON parser error - streaming parse failed at chunk boundary"
            )),
            _ => Ok(0),
        }
    }
    pub fn take_batch(&mut self) -> Vec<Price> {
        std::mem::take(&mut self.batch)
    }

    pub fn take_remaining(&mut self) -> Vec<Price> {
        std::mem::take(&mut self.batch)
    }

    fn handle_start_object(&mut self) -> Result<usize> {
        self.json_depth += 1;
        if self.at_price_key() {
            debug!("Entering card price object");
            self.current_price_json.clear();
            self.current_price_json.push('{');
            self.state = PriceParsingState::InCardPrice;
        }
        Ok(0)
    }

    fn handle_end_object(&mut self) -> Result<usize> {
        if self.at_price_key() {
            self.current_price_json.push('}');
            let _ = self.add_price_to_batch();
            return Ok(self.close_price_object()?);
        }
        Ok(0)
    }

    fn add_price_to_batch(&mut self) -> Result<()> {
        if let Some(card_uuid) = &self.current_card_uuid {
            let value: serde_json::Value = serde_json::from_str(&self.current_price_json)?;
            if let Some(price) = PriceMapper::map_json_to_price(card_uuid, &value) {
                self.batch.push(price);
            }
        }
        Ok(())
    }

    // TODO: rename? Meant to close out the current price object and reset fresh for next one, if it comes
    // gets the current batch len and returns it
    fn close_price_object(&mut self) -> Result<usize> {
        self.current_card_uuid = None;
        self.current_price_json.clear();
        let processed = if self.batch.len() >= self.batch_size {
            self.batch.len()
        } else {
            0
        };
        self.json_depth -= 1;
        Ok(processed)
    }

    fn handle_field_name(&mut self, field_name: String) -> Result<usize> {
        if 1 == self.json_depth && "data" == field_name {
            self.in_data_object = true;
        } else if self.at_price_key() {
            self.current_card_uuid = Some(field_name.clone());
        }
        if self.in_price_object() {
            if self.requires_comma() {
                self.add_comma();
            }
            self.add_field_key(field_name);
        }
        Ok(0)
    }

    fn handle_string_value(&mut self, value: String) -> Result<usize> {
        if self.in_price_object() {
            self.add_quote();
            self.current_price_json
                .push_str(&value.replace('"', "\\\""));
            self.add_quote();
        }
        Ok(0)
    }

    fn at_price_key(&self) -> bool {
        2 == self.json_depth && self.in_data_object
    }

    fn in_price_object(&mut self) -> bool {
        self.in_data_object && self.json_depth >= 2
    }

    fn requires_comma(&mut self) -> bool {
        !self.current_price_json.is_empty() && !self.current_price_json.ends_with('{')
    }

    fn add_field_key(&mut self, field_name: String) {
        self.add_string(field_name);
        self.add_colon();
    }

    fn add_comma(&mut self) {
        self.current_price_json.push(',');
    }

    fn add_string(&mut self, token: String) {
        self.add_quote();
        self.current_price_json.push_str(&token);
        self.add_quote();
    }

    fn add_quote(&mut self) {
        self.current_price_json.push('"');
    }

    fn add_colon(&mut self) {
        self.current_price_json.push(':');
    }
}

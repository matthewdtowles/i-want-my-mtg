use crate::{
    card::{mapper::CardMapper, repository::CardRepository, Card},
    database::ConnectionPool,
    shared::HttpClient,
};
use actson::tokio::AsyncBufReaderJsonFeeder;
use actson::{JsonEvent, JsonParser};
use anyhow::Result;
use futures::StreamExt;
use std::sync::Arc;
use tokio::io::BufReader;
use tokio_util::io::StreamReader;
use tracing::{debug, error, info, warn};

const BASE_INGESTION_URL: &str = "https://mtgjson.com/api/v5/";
const BATCH_SIZE: usize = 500;
const LOG_INTERVAL: usize = 1000;

pub struct CardIngestionService {
    client: HttpClient,
    repository: CardRepository,
}

impl CardIngestionService {
    pub fn new(db: Arc<ConnectionPool>, http_client: HttpClient) -> Self {
        Self {
            client: http_client,
            repository: CardRepository::new(db),
        }
    }

    /// Ingests all cards for a specific set identified by `set_code`.
    pub async fn ingest_set_cards(&self, set_code: &str) -> Result<u64> {
        info!("Starting ingestion for set: {}", set_code);
        let url = format!("{BASE_INGESTION_URL}{set_code}.json");
        let raw_data = self.client.get_json(&url).await?;
        let cards = CardMapper::map_mtg_json_to_cards(raw_data)?;
        if cards.is_empty() {
            warn!("No cards found for set: {}", set_code);
            return Ok(0);
        }
        let count = self.repository.save(&cards).await?;
        info!("Successfully ingested {} cards for set {}", count, set_code);
        Ok(count)
    }

    /// Ingests all available cards using a streaming approach.
    pub async fn ingest_all_cards_streaming(&self) -> Result<u64> {
        info!("Starting streaming ingestion of all cards from AllPrintings.json");
        let url = format!("{BASE_INGESTION_URL}AllPrintings.json");

        let byte_stream = self.client.get_bytes_stream(&url).await?;
        info!("Received byte stream for AllPrintings.json");

        // Convert the byte stream to AsyncRead using StreamReader
        let stream_reader =
            StreamReader::new(byte_stream.map(|result| {
                result.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
            }));

        // Wrap in BufReader for efficient reading
        let mut buf_reader = BufReader::new(stream_reader);

        // Use the proper Tokio feeder from actson
        let mut feeder = AsyncBufReaderJsonFeeder::new(&mut buf_reader);
        let mut parser = JsonParser::new(&mut feeder);
        let mut card_processor = StreamingCardProcessor::new(BATCH_SIZE);
        let mut total_processed = 0u64;
        let mut error_count = 0;

        loop {
            let mut event = parser.next_event();

            // Handle NeedMoreInput using the async feeder
            if event == JsonEvent::NeedMoreInput {
                match parser.feeder.fill_buf().await {
                    Ok(_) => {
                        event = parser.next_event();
                    }
                    Err(e) => {
                        error!("Failed to fill buffer: {}", e);
                        break;
                    }
                }
            }

            match event {
                JsonEvent::Eof => {
                    info!("Reached end of JSON stream");
                    let remaining_cards = card_processor.take_remaining();
                    if !remaining_cards.is_empty() {
                        let final_count = self.repository.save(&remaining_cards).await?;
                        total_processed += final_count;
                    }
                    info!(
                        "Completed streaming ingestion. Total cards processed: {}",
                        total_processed
                    );
                    return Ok(total_processed);
                }
                JsonEvent::Error => {
                    warn!(
                        "JSON parser error at depth {} on path {}",
                        card_processor.json_depth,
                        card_processor.json_path.join("/")
                    );
                    error_count += 1;
                    if error_count > 10 {
                        error!("Too many parser errors ({}). Aborting stream.", error_count);
                        return Err(anyhow::anyhow!(
                            "Streaming parse failed due to parser errors"
                        ));
                    }
                    continue;
                }
                JsonEvent::NeedMoreInput => {
                    // This should have been handled above, but just in case
                    continue;
                }
                _ => {
                    error_count = 0; // Reset error count on successful event
                    let processed_count = card_processor.process_event(event, &parser).await?;
                    if processed_count > 0 {
                        let cards = card_processor.take_batch();
                        if !cards.is_empty() {
                            let saved_count = self.repository.save(&cards).await?;
                            total_processed += saved_count;
                            if total_processed % LOG_INTERVAL as u64 == 0 {
                                info!("Processed {} cards so far...", total_processed);
                            }
                        }
                    }
                }
            }
        }

        let remaining_cards = card_processor.take_remaining();
        if !remaining_cards.is_empty() {
            let final_count = self.repository.save(&remaining_cards).await?;
            total_processed += final_count;
        }

        info!(
            "Completed streaming ingestion. Total cards processed: {}",
            total_processed
        );
        Ok(total_processed)
    }
}

/// Handles streaming JSON parsing state and card processing
struct StreamingCardProcessor {
    state: ParsingState,
    batch: Vec<Card>,
    batch_size: usize,
    current_card_json: String,
    json_depth: usize,
    in_cards_array: bool,
    in_card_object: bool,
    card_object_depth: usize,
    json_path: Vec<String>,
    // skip_depth: Option<usize>,
}

#[derive(Debug, Clone, PartialEq)]
enum ParsingState {
    Root,
    // InData,
    InSetObject,
    InCardsArray,
    InCardObject,
    SkippingValue(usize), // usize = skip_depth
}

impl StreamingCardProcessor {
    fn new(batch_size: usize) -> Self {
        Self {
            state: ParsingState::Root,
            batch: Vec::with_capacity(batch_size),
            batch_size,
            current_card_json: String::new(),
            json_depth: 0,
            in_cards_array: false,
            in_card_object: false,
            card_object_depth: 0,
            json_path: Vec::new(),
        }
    }

    async fn process_event<R: tokio::io::AsyncRead + Unpin>(
        &mut self,
        event: JsonEvent,
        parser: &JsonParser<'_, AsyncBufReaderJsonFeeder<'_, R>>,
    ) -> Result<usize> {
        // SkippingValue state: track nesting to know when to exit
        if let ParsingState::SkippingValue(skip_depth) = self.state {
            match event {
                JsonEvent::StartObject | JsonEvent::StartArray => {
                    self.json_depth += 1;
                }
                JsonEvent::EndObject | JsonEvent::EndArray => {
                    self.json_depth -= 1;
                    // Exit skip mode when we return to or below the original skip depth
                    if self.json_depth <= skip_depth {
                        self.state = ParsingState::Root;
                        // Also pop the field name we were skipping from the path
                        if !self.json_path.is_empty() {
                            self.json_path.pop();
                        }
                        debug!(
                            "Exited SkippingValue state at depth {}, returning to Root",
                            self.json_depth
                        );
                    }
                }
                JsonEvent::Error => {
                    // Parser is corrupted, we need to reset everything
                    warn!("Parser error while skipping - this indicates chunk boundary corruption");
                    return Err(anyhow::anyhow!(
                        "Parser corrupted during skip - streaming failed"
                    ));
                }
                _ => {
                    // Continue skipping all other events
                }
            }
            return Ok(0);
        }

        // Handle depth tracking for all events
        match event {
            JsonEvent::StartObject => {
                self.json_depth += 1;
                self.handle_start_object()
            }
            JsonEvent::EndObject => {
                let result = self.handle_end_object().await;
                self.json_depth -= 1;
                result
            }
            JsonEvent::StartArray => {
                self.json_depth += 1;
                self.handle_start_array()
            }
            JsonEvent::EndArray => {
                let result = self.handle_end_array();
                self.json_depth -= 1;
                result
            }
            JsonEvent::FieldName => self.handle_field_name(parser),
            JsonEvent::ValueString => {
                let value = parser.current_string().unwrap_or_default();
                self.handle_string_value(&value)
            }
            JsonEvent::ValueInt => {
                let value = parser
                    .current_i64()
                    .map(|v| v.to_string())
                    .unwrap_or_else(|_| "0".to_string());
                self.handle_number_value(&value)
            }
            JsonEvent::ValueDouble => {
                let value = parser
                    .current_f64()
                    .map(|v| v.to_string())
                    .unwrap_or_else(|_| "0.0".to_string());
                self.handle_number_value(&value)
            }
            JsonEvent::ValueTrue => self.handle_boolean_value(true),
            JsonEvent::ValueFalse => self.handle_boolean_value(false),
            JsonEvent::ValueNull => self.handle_null_value(),
            JsonEvent::Error => {
                // Parser is fundamentally broken - likely due to chunk boundary issue
                Err(anyhow::anyhow!(
                    "JSON parser error - streaming parse failed at chunk boundary"
                ))
            }
            _ => Ok(0),
        }
    }

    fn handle_start_object(&mut self) -> Result<usize> {
        // Only start building card JSON if we're inside the cards array
        if self.in_cards_array {
            debug!("Starting card object at depth {}", self.json_depth);
            self.in_card_object = true;
            self.card_object_depth = self.json_depth;
            self.current_card_json.clear();
            self.current_card_json.push('{');
            self.state = ParsingState::InCardObject;
        }
        Ok(0)
    }

    async fn handle_end_object(&mut self) -> Result<usize> {
        if self.in_card_object {
            self.current_card_json.push('}');
            if self.json_depth == self.card_object_depth {
                self.in_card_object = false;
                let card_result = self.parse_card_from_json(&self.current_card_json);

                match card_result {
                    Ok(card) => {
                        self.batch.push(card);
                        if self.batch.len() >= self.batch_size {
                            return Ok(self.batch.len());
                        }
                    }
                    Err(e) => {
                        warn!("Failed to parse card: {}", e);
                    }
                }
                self.current_card_json.clear();
            }
        }
        // Only pop if the last thing is a field name
        if let Some(_) = self.json_path.last() {
            self.json_path.pop();
        }
        Ok(0)
    }

    fn handle_field_name<R: tokio::io::AsyncRead + Unpin>(
        &mut self, 
        parser: &JsonParser<'_, AsyncBufReaderJsonFeeder<'_, R>>
    ) -> Result<usize> {
        let field_name = parser.current_string().unwrap_or_default();
        debug!("FieldName: {}", field_name);

        // Always track the path!
        self.json_path.push(field_name.clone());

        // Only skip fields we know we don't need
        // Don't skip "data" or any field that could lead to "cards"
        if !self.in_cards_array && field_name == "meta" {
            debug!("Skipping meta field");
            self.state = ParsingState::SkippingValue(self.json_depth);
        }
        // For "data" field, we want to traverse into it, not skip it
        else if field_name == "data" {
            debug!("Entering data object");
            // Don't skip - we need to traverse into data
        }
        // For set objects within data, we want to traverse into them
        else if self.json_path.len() == 2 && self.json_path[0] == "data" {
            debug!("Entering set object: {}", field_name);
            self.state = ParsingState::InSetObject;
        }
        // For "cards" field within a set, we want to traverse into it
        else if field_name == "cards" && self.json_path.len() == 3 && self.json_path[0] == "data" {
            debug!("Found cards field for set: {}", self.json_path[1]);
            // Don't skip - handle_start_array will set in_cards_array = true
        }
        // Skip other fields within sets that aren't "cards"
        else if self.json_path.len() >= 3 && self.json_path[0] == "data" && !self.in_cards_array && field_name != "cards" {
            debug!("Skipping non-cards field in set: {}", field_name);
            self.state = ParsingState::SkippingValue(self.json_depth);
        }

        if self.in_card_object {
            if !self.current_card_json.ends_with('{') && !self.current_card_json.ends_with(',') {
                self.current_card_json.push(',');
            }
            self.current_card_json.push('"');
            self.current_card_json.push_str(&field_name);
            self.current_card_json.push('"');
            self.current_card_json.push(':');
        }
        Ok(0)
    }

    fn handle_start_array(&mut self) -> Result<usize> {
        // Check if this is a "cards" array within a set
        if self.json_path.len() >= 1 
            && self.json_path[self.json_path.len() - 1] == "cards"
            && self.json_path.len() == 3  // data/SETCODE/cards
            && self.json_path[0] == "data" 
        {
            self.in_cards_array = true;
            self.state = ParsingState::InCardsArray;
            debug!(
                "Entering cards array for set: {}",
                self.json_path[1] // The set code
            );
        }
        Ok(0)
    }

    fn handle_end_array(&mut self) -> Result<usize> {
        if self.in_cards_array {
            self.in_cards_array = false;
            self.state = ParsingState::InSetObject;
            debug!("Exiting cards array");
        }
        // Only pop if the last thing is a field name
        if let Some(_) = self.json_path.last() {
            self.json_path.pop();
        }
        Ok(0)
    }

    fn handle_string_value(&mut self, value: &str) -> Result<usize> {
        if self.in_card_object {
            self.current_card_json.push('"');
            let escaped = value.replace('"', "\\\"");
            self.current_card_json.push_str(&escaped);
            self.current_card_json.push('"');
        }
        Ok(0)
    }

    fn handle_number_value(&mut self, value: &str) -> Result<usize> {
        if self.in_card_object {
            self.current_card_json.push_str(value);
        }
        Ok(0)
    }

    fn handle_boolean_value(&mut self, value: bool) -> Result<usize> {
        if self.in_card_object {
            self.current_card_json
                .push_str(if value { "true" } else { "false" });
        }
        Ok(0)
    }

    fn handle_null_value(&mut self) -> Result<usize> {
        if self.in_card_object {
            self.current_card_json.push_str("null");
        }
        Ok(0)
    }

    fn parse_card_from_json(&self, json: &str) -> Result<Card> {
        let value: serde_json::Value = serde_json::from_str(json)?;
        CardMapper::map_raw_json(&value)
    }

    fn take_batch(&mut self) -> Vec<Card> {
        std::mem::take(&mut self.batch)
    }

    fn take_remaining(&mut self) -> Vec<Card> {
        std::mem::take(&mut self.batch)
    }
}

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
use tracing::{debug, error, info, trace, warn};

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

        // Use a much larger buffer to handle long strings without splitting
        let mut buf_reader = BufReader::with_capacity(64 * 1024, stream_reader); // 512KB buffer

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
                // Try to fill buffer multiple times to ensure we get complete strings
                let mut fill_attempts = 0;
                loop {
                    match parser.feeder.fill_buf().await {
                        Ok(()) => {
                            // Check if we got more data
                            fill_attempts += 1;
                            if fill_attempts >= 3 {
                                break; // Stop after 3 attempts
                            }
                            // Try one more time to get additional data
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
                    info!("Reached end of JSON stream");
                    let remaining_cards = card_processor.take_remaining();
                    if !remaining_cards.is_empty() {
                        debug!("Saving remaining cards");
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
            debug!("Saving remaining cards (2).");
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
}

#[derive(Debug, Clone, PartialEq)]
enum ParsingState {
    Root,
    InSetObject,
    InCardsArray,
    InCardObject,
    SkippingValue(usize),
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
                    if self.json_depth <= skip_depth {
                        self.state = ParsingState::Root;
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
                _ => {} // TODO: why do we do this?
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
        if self.in_cards_array && self.json_depth == 5 && !self.in_card_object {
            // debug!("✅ STARTING card object at depth {}", self.json_depth);
            self.in_card_object = true;
            self.card_object_depth = self.json_depth;
            self.current_card_json.clear();
            self.current_card_json.push('{');
            self.state = ParsingState::InCardObject;
        } else if self.in_card_object {
            // Starting a nested object within a card
            // Check if we need a comma (for array elements)
            let last_char = self.current_card_json.chars().last();
            if !matches!(last_char, Some('{') | Some('[') | Some(':') | Some(',')) {
                self.current_card_json.push(',');
            }
            self.current_card_json.push('{');
        }
        Ok(0)
    }

    async fn handle_end_object(&mut self) -> Result<usize> {
        if self.in_card_object {
            self.current_card_json.push('}');

            // Only process when we're ending the top-level card object
            if self.json_depth == self.card_object_depth {
                self.in_card_object = false;

                // Debug: Validate JSON before parsing
                let json_valid =
                    serde_json::from_str::<serde_json::Value>(&self.current_card_json).is_ok();

                if !json_valid {
                    // Try to parse the JSON and get the exact error location
                    match serde_json::from_str::<serde_json::Value>(&self.current_card_json) {
                        Err(e) => {
                            warn!("JSON parse error: {}", e);

                            // Show the context around where the error occurs
                            let error_msg = e.to_string();
                            if let Some(line_col) = error_msg
                                .split("line ")
                                .nth(1)
                                .and_then(|s| s.split(" column ").next())
                            {
                                if let Ok(line_num) = line_col.parse::<usize>() {
                                    // Since it's all one line, show context around the error column
                                    if let Some(col_part) = error_msg.split("column ").nth(1) {
                                        if let Ok(col_num) = col_part
                                            .split_whitespace()
                                            .next()
                                            .unwrap_or("0")
                                            .parse::<usize>()
                                        {
                                            let start = col_num.saturating_sub(50);
                                            let end = std::cmp::min(
                                                col_num + 50,
                                                self.current_card_json.len(),
                                            );

                                            // Ensure we don't slice on a UTF-8 boundary
                                            let mut safe_start = start;
                                            let mut safe_end = end;

                                            while safe_start > 0
                                                && !self
                                                    .current_card_json
                                                    .is_char_boundary(safe_start)
                                            {
                                                safe_start -= 1;
                                            }
                                            while safe_end < self.current_card_json.len()
                                                && !self
                                                    .current_card_json
                                                    .is_char_boundary(safe_end)
                                            {
                                                safe_end += 1;
                                            }

                                            warn!(
                                                "Error context around column {}: '{}'",
                                                col_num,
                                                &self.current_card_json[safe_start..safe_end]
                                            );
                                        }
                                    }
                                }
                            }
                        }
                        Ok(_) => {} // Shouldn't happen since json_valid is false
                    }
                }

                let card_result = self.parse_card_from_json(&self.current_card_json);
                match card_result {
                    Ok(card) => {
                        trace!("✅ Successfully parsed card: {}", card.name.as_str());
                        self.batch.push(card);
                        if self.batch.len() >= self.batch_size {
                            debug!("Current batch size: {}", self.batch.len());
                            return Ok(self.batch.len());
                        }
                    }
                    Err(e) => {
                        warn!("Failed to parse card JSON: {}", e);
                        // Log a substantial portion to see the pattern
                        let safe_json = if self.current_card_json.len() > 1000 {
                            let mut end = 1000;
                            while end > 0 && !self.current_card_json.is_char_boundary(end) {
                                end -= 1;
                            }
                            &self.current_card_json[..end]
                        } else {
                            &self.current_card_json
                        };
                        warn!("JSON: {}", safe_json);
                    }
                }
                self.current_card_json.clear();
            }
        }

        Ok(0)
    }

    fn handle_field_name<R: tokio::io::AsyncRead + Unpin>(
        &mut self,
        parser: &JsonParser<'_, AsyncBufReaderJsonFeeder<'_, R>>,
    ) -> Result<usize> {
        let field_name = parser.current_string().unwrap_or_default();

        match field_name.as_str() {
            "meta" if self.json_depth == 1 => {
                debug!("Skipping meta field");
                self.state = ParsingState::SkippingValue(self.json_depth);
            }
            "data" if self.json_depth == 1 => {
                debug!("Entering data object");
                self.state = ParsingState::Root;
            }
            "cards" if self.json_depth == 3 => {
                debug!("Found cards field at depth 3");
                // The next StartArray will set in_cards_array = true
            }
            _ if self.in_card_object => {
                // Build card JSON - ensure proper comma placement
                if !self.current_card_json.ends_with('{') {
                    self.current_card_json.push(',');
                }
                self.current_card_json.push('"');
                self.current_card_json.push_str(&field_name);
                self.current_card_json.push('"');
                self.current_card_json.push(':');
            }
            _ => {
                // Skip non-essential fields outside cards array
                if !self.in_cards_array && field_name != "cards" && self.json_depth >= 3 {
                    self.state = ParsingState::SkippingValue(self.json_depth);
                }
            }
        }

        Ok(0)
    }

    fn handle_start_array(&mut self) -> Result<usize> {
        // Detect cards array at depth 4
        if self.json_depth == 4 {
            self.in_cards_array = true;
            self.state = ParsingState::InCardsArray;
            info!("✅ ENTERING cards array at depth {}", self.json_depth);
        }
        // Handle arrays within card objects
        else if self.in_card_object {
            // Check if we need a comma before the array
            let last_char = self.current_card_json.chars().last();
            if !matches!(last_char, Some('{') | Some('[') | Some(':') | Some(',')) {
                self.current_card_json.push(',');
            }
            self.current_card_json.push('[');
        }
        Ok(0)
    }

    fn handle_end_array(&mut self) -> Result<usize> {
        // Exit cards array at depth 4
        if self.in_cards_array && self.json_depth == 4 {
            self.in_cards_array = false;
            self.state = ParsingState::InSetObject;
            info!("✅ EXITING cards array at depth {}", self.json_depth);
        }
        // Handle arrays within card objects
        else if self.in_card_object {
            self.current_card_json.push(']');
        }
        Ok(0)
    }

    fn handle_string_value(&mut self, value: &str) -> Result<usize> {
        if self.in_card_object {
            // Debug: MTG JSON uses 16-char hashes, so URLs should be exactly 42 chars
            // Only warn if it's a URL that's clearly incomplete (ends mid-domain or no hash)
            if value.starts_with("https://")
                && (value.len() < 30 || // Very short URLs are definitely truncated
                (value.contains("mtgjson.com") && value.len() < 42) || // MTG JSON URLs should be 42+ chars
                (!value.contains("mtgjson.com") && value.len() < 50))
            {
                // Other URLs should be longer
                warn!(
                    "🔍 Actually truncated URL: '{}' (length: {})",
                    value,
                    value.len()
                );
            }

            // Check if we need a comma (not after { [ : ,)
            let last_char = self.current_card_json.chars().last();
            if !matches!(last_char, Some('{') | Some('[') | Some(':') | Some(',')) {
                self.current_card_json.push(',');
            }

            self.current_card_json.push('"');
            // Proper JSON string escaping
            for ch in value.chars() {
                match ch {
                    '"' => self.current_card_json.push_str("\\\""),
                    '\\' => self.current_card_json.push_str("\\\\"),
                    '\n' => self.current_card_json.push_str("\\n"),
                    '\r' => self.current_card_json.push_str("\\r"),
                    '\t' => self.current_card_json.push_str("\\t"),
                    '\u{08}' => self.current_card_json.push_str("\\b"),
                    '\u{0C}' => self.current_card_json.push_str("\\f"),
                    c if c.is_control() => {
                        self.current_card_json
                            .push_str(&format!("\\u{:04x}", c as u32));
                    }
                    c => self.current_card_json.push(c),
                }
            }
            self.current_card_json.push('"');
        }
        Ok(0)
    }

    fn handle_number_value(&mut self, value: &str) -> Result<usize> {
        if self.in_card_object {
            // Check if we need a comma
            let last_char = self.current_card_json.chars().last();
            if !matches!(last_char, Some('{') | Some('[') | Some(':') | Some(',')) {
                self.current_card_json.push(',');
            }
            self.current_card_json.push_str(value);
        }
        Ok(0)
    }

    fn handle_boolean_value(&mut self, value: bool) -> Result<usize> {
        if self.in_card_object {
            // Check if we need a comma
            let last_char = self.current_card_json.chars().last();
            if !matches!(last_char, Some('{') | Some('[') | Some(':') | Some(',')) {
                self.current_card_json.push(',');
            }
            self.current_card_json
                .push_str(if value { "true" } else { "false" });
        }
        Ok(0)
    }

    fn handle_null_value(&mut self) -> Result<usize> {
        if self.in_card_object {
            // Check if we need a comma
            let last_char = self.current_card_json.chars().last();
            if !matches!(last_char, Some('{') | Some('[') | Some(':') | Some(',')) {
                self.current_card_json.push(',');
            }
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

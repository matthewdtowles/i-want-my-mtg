use crate::{
    card::{mapper::CardMapper, repository::CardRepository, Card},
    database::ConnectionPool,
    utils::HttpClient,
};
use actson::tokio::AsyncBufReaderJsonFeeder;
use actson::{JsonEvent, JsonParser};
use anyhow::Result;
use futures::StreamExt;
use std::sync::Arc;
use tokio::io::BufReader;
use tokio_util::io::StreamReader;
use tracing::{debug, error, info, warn};

const BATCH_SIZE: usize = 500;

pub struct CardService {
    client: HttpClient,
    repository: CardRepository,
}

impl CardService {
    pub fn new(db: Arc<ConnectionPool>, http_client: HttpClient) -> Self {
        Self {
            client: http_client,
            repository: CardRepository::new(db),
        }
    }

    /// Ingests all cards for a specific set identified by `set_code`.
    pub async fn ingest_set_cards(&self, set_code: &str) -> Result<u64> {
        info!("Starting ingestion for set: {}", set_code);
        let url_path = format!("{set_code}.json");
        let raw_data = self.client.get_json(&url_path).await?;
        let cards = CardMapper::map_to_cards(raw_data)?;
        if cards.is_empty() {
            warn!("No cards found for set: {}", set_code);
            return Ok(0);
        }
        let count = self.repository.save(&cards).await?;
        info!("Successfully ingested {} cards for set {}", count, set_code);
        Ok(count)
    }

    /// Ingests all available cards using a streaming approach.
    pub async fn ingest_all(&self) -> Result<u64> {
        let url_path = "AllPrintings.json";
        info!("Starting streaming ingestion of all cards from {}", url_path);

        let byte_stream = self.client.get_bytes_stream(url_path).await?;
        debug!("Received byte stream for {}", url_path);

        let stream_reader =
            StreamReader::new(byte_stream.map(|result| {
                result.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
            }));

        let mut buf_reader = BufReader::with_capacity(64 * 1024, stream_reader);
        let mut feeder = AsyncBufReaderJsonFeeder::new(&mut buf_reader);
        let mut parser = JsonParser::new(&mut feeder);
        let mut card_processor = StreamingCardProcessor::new(BATCH_SIZE);
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
                    info!("Completed JSON stream processing");
                    let total_sets =
                        card_processor.sets_with_cards + card_processor.sets_without_cards;
                    info!(
                        "Final Results: {} total sets processed ({} with cards, {} without cards)",
                        total_sets,
                        card_processor.sets_with_cards,
                        card_processor.sets_without_cards
                    );
                    let remaining_cards = card_processor.take_remaining();
                    if !remaining_cards.is_empty() {
                        info!("Saving final batch of {} cards", remaining_cards.len());
                        let final_count = self.repository.save(&remaining_cards).await?;
                        total_processed += final_count;
                    }
                    info!("Total cards saved: {}", total_processed);
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
                    let processed_count = card_processor.process_event(event, &parser).await?;
                    if processed_count > 0 {
                        let cards = card_processor.take_batch();
                        if !cards.is_empty() {
                            let saved_count = self.repository.save(&cards).await?;
                            total_processed += saved_count;
                            // Only log every 5000 cards instead of 1000
                            if total_processed > 0 && total_processed % 5000 == 0 {
                                info!("Processed {} cards so far...", total_processed);
                            }
                        }
                    }
                }
            }
        }
    }

    pub async fn delete_all(&self) -> Result<u64>{
        info!("Deleting all prices.");
        self.repository.delete_all().await
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
    sets_processed: usize,
    sets_entered: usize,
    sets_with_cards: usize,
    sets_without_cards: usize,
    current_set_name: Option<String>,
    current_set_code: Option<String>,
    expecting_set_name: bool,
    expecting_set_code: bool,
    expecting_cards_array: bool,
    current_set_has_cards: bool,
    set_info_logged: bool,
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
            sets_processed: 0,
            sets_entered: 0,
            sets_with_cards: 0,
            sets_without_cards: 0,
            current_set_name: None,
            current_set_code: None,
            expecting_set_name: false,
            expecting_set_code: false,
            expecting_cards_array: false,
            current_set_has_cards: false,
            set_info_logged: false,
        }
    }

    async fn process_event<R: tokio::io::AsyncRead + Unpin>(
        &mut self,
        event: JsonEvent,
        parser: &JsonParser<'_, AsyncBufReaderJsonFeeder<'_, R>>, // Do not remove
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
                // For all other events (FieldName, ValueString, etc.): do nothing and continue
                _ => {}
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
            JsonEvent::Error => Err(anyhow::anyhow!(
                "JSON parser error - streaming parse failed at chunk boundary"
            )),
            _ => Ok(0),
        }
    }

    fn handle_start_object(&mut self) -> Result<usize> {
        // Critical: Reset ALL set state immediately when entering a new set object
        if self.json_depth == 2 {
            // Debug: Track which set object we're entering
            self.sets_entered += 1;
            debug!("Entering set object #{} at depth 2", self.sets_entered);

            // Force complete reset - clear everything from previous set
            self.current_set_name = None;
            self.current_set_code = None;
            self.expecting_set_name = false;
            self.expecting_set_code = false;
            self.expecting_cards_array = false;
            self.current_set_has_cards = false;
            self.set_info_logged = false;

            // Reset parsing state to ensure clean start
            self.state = ParsingState::InSetObject;
        }

        // Handle card objects within the cards array
        if self.in_cards_array && self.json_depth == 5 && !self.in_card_object {
            self.in_card_object = true;
            self.card_object_depth = self.json_depth;
            self.current_card_json.clear();
            self.current_card_json.push('{');
            self.state = ParsingState::InCardObject;
        } else if self.in_card_object {
            // Starting a nested object within a card
            let last_char = self.current_card_json.chars().last();
            if !matches!(last_char, Some('{') | Some('[') | Some(':') | Some(',')) {
                self.current_card_json.push(',');
            }
            self.current_card_json.push('{');
        }
        Ok(0)
    }

    async fn handle_end_object(&mut self) -> Result<usize> {
        // Track when we exit a set object at depth 2
        if self.json_depth == 2 {
            // Only count sets that have both name and code (complete sets)
            if self.current_set_name.is_some() && self.current_set_code.is_some() {
                if self.current_set_has_cards {
                    self.sets_with_cards += 1;
                }
            }
        }

        if self.in_card_object {
            self.current_card_json.push('}');
            // Only process when we're ending the top-level card object
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
                        if let Some(code) = &self.current_set_code {
                            warn!("Failed to parse {} card: {}", code, e);
                        }
                    }
                }
                self.current_card_json.clear();
            }
        }
        Ok(0)
    }

    fn handle_start_array(&mut self) -> Result<usize> {
        // Only detect cards array when we're expecting it
        if self.json_depth == 4 && self.expecting_cards_array {
            self.in_cards_array = true;
            self.state = ParsingState::InCardsArray;
            self.current_set_has_cards = true;
            self.expecting_cards_array = false;

            // Try to log set info now if we have it and haven't logged yet
            self.try_log_set_start();
        }
        // Handle arrays within card objects
        else if self.in_card_object {
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
            self.sets_processed += 1;
        }
        // Handle arrays within card objects
        else if self.in_card_object {
            self.current_card_json.push(']');
        }
        Ok(0)
    }

    fn handle_field_name<R: tokio::io::AsyncRead + Unpin>(
        &mut self,
        parser: &JsonParser<'_, AsyncBufReaderJsonFeeder<'_, R>>,
    ) -> Result<usize> {
        let field_name = parser.current_string().unwrap_or_default();

        if self.json_depth == 2 {
            debug!("ENTERING SET: '{}'", field_name);
            // Reset all state for new set
            self.current_set_name = None;
            self.current_set_code = Some(field_name.clone());
            self.expecting_set_name = false;
            self.expecting_set_code = false;
            self.expecting_cards_array = false;
            self.current_set_has_cards = false;
            self.set_info_logged = false;
            return Ok(0);
        }

        match field_name.as_str() {
            "meta" if self.json_depth == 1 => {
                self.state = ParsingState::SkippingValue(self.json_depth);
            }
            "data" if self.json_depth == 1 => {
                self.state = ParsingState::Root;
            }
            "name" if self.json_depth == 3 => {
                self.expecting_set_name = true;
            }
            "cards" if self.json_depth == 3 => {
                self.expecting_cards_array = true;
            }
            _ if self.in_card_object => {
                // Build card JSON
                if !self.current_card_json.ends_with('{') {
                    self.current_card_json.push(',');
                }
                self.current_card_json.push('"');
                self.current_card_json.push_str(&field_name);
                self.current_card_json.push('"');
                self.current_card_json.push(':');
            }
            _ => {
                // Don't skip fields within the current set
                if !self.in_cards_array
                    && !["name", "cards"].contains(&field_name.as_str())
                    && self.json_depth >= 3
                    && self.current_set_code.is_none()
                {
                    self.state = ParsingState::SkippingValue(self.json_depth);
                }
            }
        }
        Ok(0)
    }

    fn handle_string_value(&mut self, value: &str) -> Result<usize> {
        if self.expecting_set_name && self.json_depth == 3 {
            self.current_set_name = Some(value.to_string());
            self.expecting_set_name = false;
            self.try_log_set_start();
        }

        // Handle card object values
        if self.in_card_object {
            // Check if we need a comma
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

    fn try_log_set_start(&mut self) {
        // Only log if we have both name and code and are processing cards
        if !self.set_info_logged
            && self.current_set_name.is_some()
            && self.current_set_code.is_some()
            && self.current_set_has_cards
        {
            let code = self.current_set_code.as_deref().unwrap();
            let name = self.current_set_name.as_deref().unwrap();

            info!("Processing cards for set: {} ({})", code, name);
            self.set_info_logged = true;
        }
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
        let result = CardMapper::map_json_to_card(&value);
        result
    }

    fn take_batch(&mut self) -> Vec<Card> {
        std::mem::take(&mut self.batch)
    }

    fn take_remaining(&mut self) -> Vec<Card> {
        std::mem::take(&mut self.batch)
    }
}

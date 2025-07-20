use crate::{
    card::{mapper::CardMapper, repository::CardRepository, Card},
    database::ConnectionPool,
    shared::HttpClient,
};
use actson::feeder::PushJsonFeeder;
use actson::{JsonEvent, JsonParser};
use anyhow::Result;
use futures::StreamExt;
use std::sync::Arc;
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

        let mut byte_stream = self.client.get_bytes_stream(&url).await?;
        info!("Received byte stream for AllPrintings.json");
        let mut feeder = PushJsonFeeder::new();
        let mut parser = JsonParser::new(&mut feeder);
        let mut card_processor = StreamingCardProcessor::new(BATCH_SIZE);
        let mut total_processed = 0u64;

        loop {
            trace!("Get next event...");
            let mut event = parser.next_event();
            trace!("Parser event: {:?}", event);
            while event == JsonEvent::NeedMoreInput {
                debug!("Need more input...");
                match byte_stream.next().await {
                    Some(chunk_result) => {
                        let chunk = chunk_result?;
                        debug!("Processing chunk of {} bytes", chunk.len());
                        parser.feeder.push_bytes(&chunk);
                    }
                    None => {
                        debug!("No more bytes. Marking feeder as done.");
                        parser.feeder.done();
                    }
                }
                event = parser.next_event();
                debug!("Parser event: {:?}", event);
            }
            match event {
                JsonEvent::Eof => {
                    info!("Found EOF.");
                    break;
                }
                JsonEvent::Error => {
                    if card_processor.in_card_object {
                        error!("JSON parser encountered an error while processing a card. Aborting stream ingestion.");
                        break;
                    }
                    warn!("JSON parser encountered an error outside card processing. Skipping and continuing...");
                    continue;
                }
                _ => {
                    let processed_count = card_processor.process_event(event, &parser).await?;
                    if processed_count > 0 {
                        let cards = card_processor.take_batch();
                        if !cards.is_empty() {
                            debug!("Cards vector has contents.");
                            let saved_count = self.repository.save(&cards).await?;
                            debug!("Saved count = {:?}", saved_count);
                            total_processed += saved_count;
                            debug!("Total Processed so far: {:?}", total_processed);

                            if total_processed % LOG_INTERVAL as u64 == 0 {
                                debug!("Processed {:?} cards so far...", total_processed);
                            }
                        }
                    }
                }
            }
        }

        let remaining_cards = card_processor.take_remaining();
        if !remaining_cards.is_empty() {
            info!("Remaining cards is not empty.");
            let final_count = self.repository.save(&remaining_cards).await?;
            total_processed += final_count;
        }

        info!(
            "Completed streaming ingestion. Total cards processed: {:?}",
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
    InData,
    InSetObject,
    InCardsArray,
    InCardObject,
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

    async fn process_event(
        &mut self,
        event: JsonEvent,
        parser: &JsonParser<'_, PushJsonFeeder>,
    ) -> Result<usize> {
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
            JsonEvent::StartArray => self.handle_start_array(),
            JsonEvent::EndArray => self.handle_end_array(),
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
            _ => Ok(0),
        }
    }

    fn handle_start_object(&mut self) -> Result<usize> {
        if self.in_cards_array && self.json_depth > 0 {
            debug!("Starting card object at depth {}", self.json_depth);
            self.in_card_object = true;
            self.card_object_depth = self.json_depth;
            self.current_card_json.clear();
            self.current_card_json.push('{');
            self.state = ParsingState::InCardObject;
        }

        match self.state {
            ParsingState::Root if self.json_depth == 1 => {
                self.state = ParsingState::Root;
            }
            ParsingState::InData if self.json_depth > 2 => {
                self.state = ParsingState::InSetObject;
            }
            _ => {}
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

        if !self.json_path.is_empty() {
            self.json_path.pop();
        }

        match self.state {
            ParsingState::InSetObject if self.json_depth <= 3 => {
                self.state = ParsingState::InData;
            }
            _ => {}
        }

        Ok(0)
    }

    fn handle_field_name(&mut self, parser: &JsonParser<PushJsonFeeder>) -> Result<usize> {
        let field_name = parser.current_string().unwrap_or_default();
        debug!("FieldName: {}", field_name);

        self.json_path.push(field_name.clone());

        // Only build up card JSON if in_card_object
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
        if self.json_path.len() >= 3
            && self.json_path[self.json_path.len() - 3] == "data"
            && self.json_path[self.json_path.len() - 1] == "cards"
        {
            self.in_cards_array = true;
            self.state = ParsingState::InCardsArray;
            debug!(
                "Entering cards array for set: {}",
                self.json_path[self.json_path.len() - 2]
            );
        } else {
            debug!("StartArray at path: {:?}", self.json_path);
        }
        Ok(0)
    }

    fn handle_end_array(&mut self) -> Result<usize> {
        if self.in_cards_array {
            self.in_cards_array = false;
            self.state = ParsingState::InSetObject;
            debug!("Exiting cards array");
        }
        if !self.json_path.is_empty() {
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

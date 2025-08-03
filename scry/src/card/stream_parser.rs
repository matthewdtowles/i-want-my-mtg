use crate::card::{mapper::CardMapper, models::Card};
use actson::tokio::AsyncBufReaderJsonFeeder;
use actson::{JsonEvent, JsonParser};
use anyhow::Result;
use tracing::{debug, info, warn};

/// Handles streaming JSON parsing state and card processing
pub struct CardStreamParser {
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
    current_set_code: Option<String>,
    expecting_cards_array: bool,
}

#[derive(Debug, Clone, PartialEq)]
enum ParsingState {
    Root,
    InSetObject,
    InCardsArray,
    InCardObject,
    SkippingValue(usize),
}

impl CardStreamParser {
    pub fn new(batch_size: usize) -> Self {
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
            current_set_code: None,
            expecting_cards_array: false,
        }
    }

    pub async fn process_event<R: tokio::io::AsyncRead + Unpin>(
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
                // Other Json Events: do nothing
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

    pub fn take_batch(&mut self) -> Vec<Card> {
        std::mem::take(&mut self.batch)
    }

    pub fn json_depth(&mut self) -> usize {
        self.json_depth
    }

    pub fn json_path(&self) -> &Vec<String> {
        &self.json_path
    }

    fn handle_start_object(&mut self) -> Result<usize> {
        // Critical: Reset ALL set state immediately when entering a new set object
        if self.json_depth == 2 {
            // Force complete reset - clear everything from previous set
            self.current_set_code = None;
            self.expecting_cards_array = false;

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
            self.expecting_cards_array = false;

            if self.current_set_code.is_some() {
                let code = self.current_set_code.as_deref().unwrap();
                info!("Processing cards for set: {}", code);
            }
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
            self.current_set_code = Some(field_name.clone());
            self.expecting_cards_array = false;
            return Ok(0);
        }

        match field_name.as_str() {
            "meta" if self.json_depth == 1 => {
                self.state = ParsingState::SkippingValue(self.json_depth);
            }
            "data" if self.json_depth == 1 => {
                self.state = ParsingState::Root;
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
        CardMapper::map_json_to_card(&value)
    }
}

use crate::card::{mapper::CardMapper, models::Card};
use actson::tokio::AsyncBufReaderJsonFeeder;
use actson::{JsonEvent, JsonParser};
use anyhow::Result;
use bytes::Bytes;
use futures::StreamExt;
use tokio::io::BufReader;
use tokio_util::io::StreamReader;
use tracing::{debug, error, info, warn};

const BUF_READER_SIZE: usize = 64 * 1024;

pub struct CardStreamParser {
    batch: Vec<Card>,
    batch_size: usize,
    card_object_depth: usize,
    current_card_json: String,
    current_set_code: Option<String>,
    expecting_cards_array: bool,
    in_card_object: bool,
    in_cards_array: bool,
    in_set_object: bool,
    is_skipping_value: bool,
    json_depth: usize,
    skip_depth: usize,
}

impl CardStreamParser {
    pub fn new(batch_size: usize) -> Self {
        Self {
            batch: Vec::with_capacity(batch_size),
            batch_size,
            card_object_depth: 0,
            current_card_json: String::new(),
            current_set_code: None,
            expecting_cards_array: false,
            in_card_object: false,
            in_cards_array: false,
            in_set_object: false,
            is_skipping_value: false,
            json_depth: 0,
            skip_depth: 0,
        }
    }

    pub async fn parse_stream<'a, S, F>(&mut self, byte_stream: S, mut on_batch: F) -> Result<()>
    where
        S: futures::Stream<Item = Result<Bytes, reqwest::Error>>,
        F: FnMut(Vec<Card>) -> futures::future::BoxFuture<'a, Result<()>>,
    {
        let stream_reader =
            StreamReader::new(byte_stream.map(|result| {
                result.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
            }));
        let mut pinned_stream_reader = Box::pin(stream_reader);
        let mut buf_reader =
            BufReader::with_capacity(BUF_READER_SIZE, pinned_stream_reader.as_mut());
        let mut feeder = AsyncBufReaderJsonFeeder::new(&mut buf_reader);
        let mut parser = JsonParser::new(&mut feeder);
        let mut error_count = 0;
        loop {
            let event = self.get_next_event(&mut parser).await;
            let should_continue = self
                .handle_parse_event(event, &parser, &mut on_batch, &mut error_count)
                .await?;
            if !should_continue {
                return Ok(());
            }
        }
    }

    async fn get_next_event<R: tokio::io::AsyncRead + Unpin>(
        &self,
        parser: &mut JsonParser<'_, AsyncBufReaderJsonFeeder<'_, R>>,
    ) -> JsonEvent {
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
                    }
                }
            }
            event = parser.next_event();
        }
        event
    }

    async fn handle_parse_event<'a, R, F>(
        &mut self,
        event: JsonEvent,
        parser: &JsonParser<'_, AsyncBufReaderJsonFeeder<'_, R>>,
        on_batch: &mut F,
        error_count: &mut usize,
    ) -> Result<bool>
    where
        R: tokio::io::AsyncRead + Unpin,
        F: FnMut(Vec<Card>) -> futures::future::BoxFuture<'a, Result<()>>,
    {
        match event {
            JsonEvent::Eof => {
                let remaining = self.take_batch();
                if !remaining.is_empty() {
                    debug!("Processing final batch of {} length", remaining.len());
                    on_batch(remaining).await?;
                }
                Ok(false)
            }
            JsonEvent::Error => {
                warn!("JSON parser error.");
                *error_count += 1;
                if *error_count > 10 {
                    error!("Parser error limit (10) exceeded. Aborting stream.");
                    return Err(anyhow::anyhow!("JSON streaming parse failed."));
                }
                Ok(true)
            }
            JsonEvent::NeedMoreInput => Ok(true),
            _ => {
                *error_count = 0;
                let processed_count = self.process_event(event, parser).await?;
                if processed_count > 0 {
                    let batch = self.take_batch();
                    if !batch.is_empty() {
                        on_batch(batch).await?;
                    }
                }
                Ok(true)
            }
        }
    }

    async fn process_event<R: tokio::io::AsyncRead + Unpin>(
        &mut self,
        event: JsonEvent,
        parser: &JsonParser<'_, AsyncBufReaderJsonFeeder<'_, R>>, // Do not remove
    ) -> Result<usize> {
        if self.is_skipping_value {
            match event {
                JsonEvent::StartObject | JsonEvent::StartArray => {
                    self.json_depth += 1;
                }
                JsonEvent::EndObject | JsonEvent::EndArray => {
                    self.json_depth -= 1;
                    if self.json_depth <= self.skip_depth {
                        self.is_skipping_value = false;
                    }
                }
                _ => {}
            }
            return Ok(0);
        }
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

    fn take_batch(&mut self) -> Vec<Card> {
        std::mem::take(&mut self.batch)
    }

    fn handle_start_object(&mut self) -> Result<usize> {
        // Critical: Reset ALL set state immediately when entering a new set object
        if self.json_depth == 2 {
            self.current_set_code = None;
            self.expecting_cards_array = false;
            self.in_set_object = true;
        }
        // Handle card objects within the cards array
        if self.in_cards_array && self.json_depth == 5 && !self.in_card_object {
            self.in_card_object = true;
            self.card_object_depth = self.json_depth;
            self.current_card_json.clear();
            self.current_card_json.push('{');
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
        if self.json_depth == 4 && self.expecting_cards_array {
            self.in_cards_array = true;
            self.expecting_cards_array = false;
            if self.current_set_code.is_some() {
                let code = self.current_set_code.as_deref().unwrap();
                info!("Processing cards for set: {}", code);
            }
        } else if self.in_card_object {
            let last_char = self.current_card_json.chars().last();
            if !matches!(last_char, Some('{') | Some('[') | Some(':') | Some(',')) {
                self.current_card_json.push(',');
            }
            self.current_card_json.push('[');
        }
        Ok(0)
    }

    fn handle_end_array(&mut self) -> Result<usize> {
        if self.in_cards_array && self.json_depth == 4 {
            self.in_cards_array = false;
        } else if self.in_card_object {
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
                self.is_skipping_value = true;
                self.skip_depth = self.json_depth;
            }
            "cards" if self.json_depth == 3 => {
                self.expecting_cards_array = true;
            }
            _ if self.in_card_object => {
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
                    self.is_skipping_value = true;
                    self.skip_depth = self.json_depth;
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

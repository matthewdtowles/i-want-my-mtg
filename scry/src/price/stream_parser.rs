use crate::price::models::Price;
use actson::tokio::AsyncBufReaderJsonFeeder;
use actson::{JsonEvent, JsonParser};
use anyhow::Result;
use bytes::Bytes;
use chrono::NaiveDate;
use futures::StreamExt;
use rust_decimal::prelude::FromPrimitive;
use rust_decimal::Decimal;
use tokio::io::BufReader;
use tokio_util::io::StreamReader;
use tracing::{debug, error, warn};

const ALLOWED_PROVIDERS: &[&str] = &["tcgplayer", "cardkingdom", "cardsphere"];
const BUF_READER_SIZE: usize = 64 * 1024;

pub struct PriceStreamParser {
    accumulator: Option<PriceAccumulator>,
    batch: Vec<Price>,
    batch_size: usize,
    current_card_uuid: Option<String>,
    in_data_object: bool,
    json_depth: usize,
    path: Vec<String>,
}

impl PriceStreamParser {
    pub fn new(batch_size: usize) -> Self {
        Self {
            accumulator: None,
            batch: Vec::with_capacity(batch_size),
            batch_size,
            current_card_uuid: None,
            in_data_object: false,
            json_depth: 0,
            path: Vec::new(),
        }
    }

    pub async fn parse_stream<'a, S, F>(
        &mut self,
        byte_stream: S,
        mut on_batch: F,
    ) -> Result<()>
    where
        S: futures::Stream<Item = Result<Bytes, reqwest::Error>>,
        F: FnMut(Vec<Price>) -> futures::future::BoxFuture<'a, Result<()>>,
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

    async fn process_event<R: tokio::io::AsyncRead + Unpin>(
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
                        break;
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
        F: FnMut(Vec<Price>) -> futures::future::BoxFuture<'a, Result<()>>,
    {
        match event {
            JsonEvent::Eof => {
                debug!("Reached end of all prices JSON file.");
                let remaining_prices = self.take_batch();
                if !remaining_prices.is_empty() {
                    debug!(
                        "Processing final batch of {} prices",
                        remaining_prices.len()
                    );
                    on_batch(remaining_prices).await?;
                }
                Ok(false)
            }
            JsonEvent::Error => {
                warn!("JSON parser error.");
                *error_count += 1;
                if *error_count > 10 {
                    error!("Parser error limit (10) exceeded. Aborting stream.");
                    return Err(anyhow::anyhow!(
                        "Streaming parse failed due to parser errors"
                    ));
                }
                Ok(true)
            }
            JsonEvent::NeedMoreInput => {
                debug!("JSON parser needs more input...");
                Ok(true)
            }
            _ => {
                *error_count = 0;
                let processed_count = self.process_event(event, parser).await?;
                if processed_count > 0 {
                    let prices = self.take_batch();
                    if !prices.is_empty() {
                        on_batch(prices).await?;
                    }
                }
                Ok(true)
            }
        }
    }

    pub fn take_batch(&mut self) -> Vec<Price> {
        std::mem::take(&mut self.batch)
    }

    fn handle_start_object(&mut self) -> Result<usize> {
        self.json_depth += 1;
        Ok(0)
    }

    fn handle_end_object(&mut self) -> Result<usize> {
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
        if self.in_price_object() {
            self.in_data_object = false;
            self.path.pop();
        }
        self.json_depth -= 1;
        self.path.pop();
        Ok(0)
    }

    fn handle_field_name(&mut self, field_name: String) -> Result<usize> {
        if self.json_depth == 1 && field_name == "data" {
            self.in_data_object = true;
        } else if self.in_price_object() {
            self.current_card_uuid = Some(field_name.clone());
            self.accumulator = Some(PriceAccumulator::new());
        }
        self.path.push(field_name);
        Ok(0)
    }

    fn handle_value(&mut self, value: String) -> Result<usize> {
        if let Some(acc) = self.accumulator.as_mut() {
            let at_price_value = self.path.len() == 7
                && self.path[0] == "data"
                && self.path[2] == "paper"
                && self.path[4] == "retail"
                && (self.path[5] == "normal" || self.path[5] == "foil");
            if at_price_value {
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
        self.path.pop();
        Ok(0)
    }

    fn in_price_object(&self) -> bool {
        self.in_data_object && self.json_depth == 2
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

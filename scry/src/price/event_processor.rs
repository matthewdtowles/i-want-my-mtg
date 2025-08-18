use crate::price::models::Price;
use crate::utils::json_stream_parser::JsonEventProcessor;
use actson::tokio::AsyncBufReaderJsonFeeder;
use actson::{JsonEvent, JsonParser};
use anyhow::Result;
use chrono::NaiveDate;
use rust_decimal::prelude::FromPrimitive;
use rust_decimal::Decimal;

const ALLOWED_PROVIDERS: &[&str] = &["tcgplayer", "cardkingdom", "cardsphere"];

pub struct PriceEventProcessor {
    accumulator: Option<PriceAccumulator>,
    batch: Vec<Price>,
    batch_size: usize,
    current_card_uuid: Option<String>,
    in_data_object: bool,
    json_depth: usize,
    path: Vec<String>,
}

impl JsonEventProcessor<Price> for PriceEventProcessor {
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

    fn take_batch(&mut self) -> Vec<Price> {
        std::mem::take(&mut self.batch)
    }
}

impl PriceEventProcessor {
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

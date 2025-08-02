use crate::price::models::Price;
use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde_json::Value;

pub struct PriceMapper;

impl PriceMapper {
    pub fn map_json_to_price(card_uuid: &str, price_data: &Value) -> Option<Price> {
        let card_id = String::from(card_uuid);
        let paper = price_data.get("paper")?;
        let mut foil_sum = Decimal::ZERO;
        let mut foil_count = 0u32;
        let mut normal_sum = Decimal::ZERO;
        let mut normal_count = 0u32;
        let mut found_date: Option<NaiveDate> = None;
        for (_provider, provider_obj) in paper.as_object()? {
            if provider_obj.get("currency").and_then(|c| c.as_str()) != Some("USD") {
                continue;
            }
            let retail = provider_obj.get("retail")?;
            for (variant, sum, count) in [
                ("foil", &mut foil_sum, &mut foil_count),
                ("normal", &mut normal_sum, &mut normal_count),
            ] {
                if let Some(prices) = retail.get(variant).and_then(|v| v.as_object()) {
                    for (price_date, price_val) in prices {
                        if let Some(val) = price_val.as_f64() {
                            *sum += Decimal::from_f64_retain(val)?;
                            *count += 1;
                            if found_date.is_none() {
                                found_date = NaiveDate::parse_from_str(price_date, "%Y-%m-%d").ok();
                            }
                        }
                    }
                }
            }
        }
        let foil = Self::avg(foil_sum, foil_count);
        let normal = Self::avg(normal_sum, normal_count);
        match (foil.as_ref(), normal.as_ref(), found_date) {
            (None, None, _) => None,
            (_, _, Some(date)) => Some(Price {
                id: None,
                card_id,
                foil,
                normal,
                date,
            }),
            _ => None,
        }
    }

    fn avg(sum: Decimal, count: u32) -> Option<Decimal> {
        match count {
            0 => None,
            _ => Some(sum / Decimal::from(count))
        }
    }
}

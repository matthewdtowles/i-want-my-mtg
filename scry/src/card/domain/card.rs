use crate::card::models::{CardRarity, Format, Legality, LegalityStatus};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Clone, Debug, FromRow, Serialize, Deserialize)]
pub struct Card {
    pub artist: Option<String>,
    pub has_foil: bool,
    pub has_non_foil: bool,
    pub id: String,
    pub img_src: String,
    pub in_main: bool,
    pub is_alternative: bool,
    pub is_reserved: bool,

    #[sqlx(skip)]
    pub is_online_only: bool,

    #[sqlx(skip)]
    pub is_oversized: bool,

    #[sqlx(skip)]
    pub language: String,

    pub layout: String,

    #[sqlx(skip)]
    pub legalities: Vec<Legality>,

    pub mana_cost: Option<String>,
    pub name: String,
    pub number: String,
    pub oracle_text: Option<String>,

    #[sqlx(skip)]
    pub other_face_ids: Option<Vec<String>>,

    pub rarity: CardRarity,
    pub set_code: String,

    #[sqlx(skip)]
    pub side: Option<String>,

    pub sort_number: String,

    #[sqlx(rename = "type")]
    pub type_line: String,
}

impl Card {
    pub fn should_filter(&self) -> bool {
        if self.is_online_only || self.is_oversized {
            return true;
        }
        if let Some(side) = self.side.as_deref() {
            return side != "a";
        }
        false
    }

    pub fn is_split_card(&self) -> bool {
        matches!(self.layout.as_str(), "split" | "aftermath")
    }

    pub fn is_foreign(&self) -> bool {
        !self.language.is_empty() && self.language != "English"
    }

    pub fn merge_mana_cost(&mut self, other_cost: Option<&str>) {
        if let (Some(my_cost), Some(other)) = (&self.mana_cost, other_cost) {
            self.mana_cost = Some(format!("{} // {}", my_cost, other));
        } else if let Some(other) = other_cost {
            self.mana_cost = Some(other.to_string());
        }
    }

    pub fn is_legal_in(&self, format: Format) -> bool {
        self.legalities
            .iter()
            .any(|l| l.format == format && l.status == LegalityStatus::Legal)
    }

    pub fn is_banned_in(&self, format: Format) -> bool {
        self.legalities
            .iter()
            .any(|l| l.format == format && l.status == LegalityStatus::Banned)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_card() -> Card {
        Card {
            artist: Some("Artist Name".to_string()),
            has_foil: true,
            has_non_foil: true,
            id: "test-id".to_string(),
            img_src: "a/b/test.jpg".to_string(),
            in_main: true,
            is_alternative: false,
            is_reserved: false,
            is_online_only: false,
            is_oversized: false,
            language: "English".to_string(),
            layout: "normal".to_string(),
            legalities: vec![Legality::new(
                "test-id".to_string(),
                Format::Standard,
                LegalityStatus::Legal,
            )],
            mana_cost: Some("{2}{U}".to_string()),
            name: "Test Card".to_string(),
            number: "123".to_string(),
            oracle_text: Some("Test text".to_string()),
            other_face_ids: None,
            rarity: CardRarity::Rare,
            set_code: "tst".to_string(),
            side: None,
            sort_number: "000123".to_string(),
            type_line: "Creature — Test".to_string(),
        }
    }

    #[test]
    fn test_should_filter_online_only() {
        let mut card = create_test_card();
        assert!(!card.should_filter());
        card.is_online_only = true;
        assert!(card.should_filter());
    }

    #[test]
    fn test_is_split_card() {
        let mut card = create_test_card();
        assert!(!card.is_split_card());
        card.layout = "split".to_string();
        assert!(card.is_split_card());
    }

    #[test]
    fn test_merge_mana_cost() {
        let mut card = create_test_card();
        card.merge_mana_cost(Some("{R}{G}"));
        assert_eq!(card.mana_cost, Some("{2}{U} // {R}{G}".to_string()));
    }
}

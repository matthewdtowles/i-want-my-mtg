use anyhow::Result;
use std::cmp::Ordering;

/// Value object representing a Magic card's collector number.
/// Encapsulates parsing, validation, and comparison logic for sort order.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CardNumber {
    /// The raw string as it appears in the source data
    raw: String,

    /// Parsed integer if the number is purely numeric (for sorting/comparison)
    parsed_int: Option<i64>,

    /// Whether the number contains non-ASCII characters
    has_non_ascii: bool,
}

impl CardNumber {
    /// Parse a card number from a string.
    ///
    /// Examples:
    /// - "123" → parsed_int: Some(123)
    /// - "123a" → parsed_int: None (not pure integer)
    /// - "232†" → parsed_int: None, has_non_ascii: true
    /// - "Ⅸ" → parsed_int: None, has_non_ascii: true
    pub fn parse(s: &str) -> Result<Self> {
        let trimmed = s.trim();
        if trimmed.is_empty() {
            return Err(anyhow::anyhow!("Card number cannot be empty"));
        }

        let has_non_ascii = !trimmed.is_ascii();

        // Check if entire string is pure digits (no letters/symbols)
        let parsed_int = if trimmed.chars().all(|c| c.is_ascii_digit()) {
            trimmed.parse::<i64>().ok()
        } else {
            None
        };

        Ok(Self {
            raw: s.to_string(),
            parsed_int,
            has_non_ascii,
        })
    }

    /// Returns the raw string representation
    pub fn as_str(&self) -> &str {
        &self.raw
    }

    /// Returns the parsed integer (if the number is purely numeric)
    pub fn as_int(&self) -> Option<i64> {
        self.parsed_int
    }

    /// Returns true if the number is a pure integer (no suffix/letters)
    pub fn is_pure_integer(&self) -> bool {
        self.parsed_int.is_some()
    }

    /// Returns true if the number contains non-ASCII characters
    pub fn has_non_ascii(&self) -> bool {
        self.has_non_ascii
    }

    /// Compare two card numbers for sorting purposes.
    ///
    /// Sort order:
    /// 1. Pure integers come before non-integers
    /// 2. Within pure integers, sort numerically
    /// 3. Non-integers sort lexicographically by raw string
    pub fn compare_for_sort(&self, other: &CardNumber) -> Ordering {
        match (self.parsed_int, other.parsed_int) {
            (Some(a), Some(b)) => a.cmp(&b),
            (Some(_), None) => Ordering::Less, // integers before non-integers
            (None, Some(_)) => Ordering::Greater, // non-integers after integers
            (None, None) => self.raw.cmp(&other.raw),
        }
    }
}

impl std::fmt::Display for CardNumber {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.raw)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_pure_integer() {
        let num = CardNumber::parse("123").unwrap();
        println!(
            "parse '123' -> int: {:?}, ascii: {}",
            num.as_int(),
            !num.has_non_ascii()
        );
        assert_eq!(num.as_int(), Some(123));
        assert!(num.is_pure_integer());
        assert!(!num.has_non_ascii());
    }

    #[test]
    fn test_parse_with_suffix() {
        let num = CardNumber::parse("123a").unwrap();
        println!("parse '123a' -> int: {:?}", num.as_int());
        assert_eq!(num.as_int(), None);
        assert!(!num.is_pure_integer());
    }

    #[test]
    fn test_parse_non_ascii() {
        let num = CardNumber::parse("232†").unwrap();
        println!("parse '232†' -> has_non_ascii: {}", num.has_non_ascii());
        assert_eq!(num.as_int(), None);
        assert!(num.has_non_ascii());
        assert_eq!(num.as_str(), "232†");
    }

    #[test]
    fn test_parse_roman_numeral() {
        let num = CardNumber::parse("Ⅸ").unwrap();
        println!("parse 'Ⅸ' -> has_non_ascii: {}", num.has_non_ascii());
        assert_eq!(num.as_int(), None);
        assert!(num.has_non_ascii());
    }

    #[test]
    fn test_compare_integers() {
        let a = CardNumber::parse("10").unwrap();
        let b = CardNumber::parse("2").unwrap();
        println!("compare '10' vs '2' -> {:?}", a.compare_for_sort(&b));
        assert_eq!(a.compare_for_sort(&b), Ordering::Greater);
    }

    #[test]
    fn test_compare_integer_vs_non_integer() {
        let a = CardNumber::parse("10").unwrap();
        let b = CardNumber::parse("2a").unwrap();
        println!("compare '10' vs '2a' -> {:?}", a.compare_for_sort(&b));
        assert_eq!(a.compare_for_sort(&b), Ordering::Less); // integers first
    }

    #[test]
    fn test_empty_string_fails() {
        assert!(CardNumber::parse("").is_err());
        assert!(CardNumber::parse("   ").is_err());
    }

    #[test]
    fn test_display_trait() {
        let num = CardNumber::parse("123a").unwrap();
        assert_eq!(format!("{}", num), "123a");
    }
}

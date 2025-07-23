use serde::{Deserialize, Serialize};
use sqlx::Type;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[sqlx(type_name = "card_rarity_enum")]
#[sqlx(rename_all = "lowercase")]
pub enum CardRarity {
    Common,
    Uncommon,
    Rare,
    MythicRare,
    Bonus,
    Special,
}

impl CardRarity {
    pub fn as_str(&self) -> &'static str {
        match self {
            CardRarity::Common => "common",
            CardRarity::Uncommon => "uncommon",
            CardRarity::Rare => "rare",
            CardRarity::MythicRare => "mythic",
            CardRarity::Bonus => "bonus",
            CardRarity::Special => "special",
        }
    }
}

impl std::fmt::Display for CardRarity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl std::str::FromStr for CardRarity {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "common" => Ok(CardRarity::Common),
            "uncommon" => Ok(CardRarity::Uncommon),
            "rare" => Ok(CardRarity::Rare),
            "mythic" => Ok(CardRarity::MythicRare),
            "bonus" => Ok(CardRarity::Bonus),
            "special" => Ok(CardRarity::Special),
            _ => Err(format!("Unknown card rarity: {}", s)),
        }
    }
}

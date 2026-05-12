# Phase 1 + Phase 2 Implementation Spec

**Goal:** fix the SOS-style "base_size = 0" data-lag bug at the card level (Phase 1), and tighten which sets are considered `is_main` so that bonus-mini-sets like BIG and MAT are correctly excluded (Phase 2).

Both phases live in **scry**. No iwmm code changes are required; iwmm picks up the corrected values on the next ingest because it reads `set.is_main` and `card.in_main` from the database. Phase 2 requires no schema migration on either side - `parent_code` already exists and is populated.

---

## Phase 1 - card-level classifier

### File: `scry/src/card/domain/main_set_classifier.rs`

Change the classifier signature to accept the set type, and add a fallback path for when `boosterTypes` is absent.

#### Current

```rust
pub fn is_main_set_card(card_data: &Value) -> bool {
    if let Some(promo_types) = card_data.get("promoTypes").and_then(|v| v.as_array()) {
        if !Self::has_canonical_promo_types(promo_types) {
            return false;
        }
    }
    if let Some(booster_types) = card_data.get("boosterTypes").and_then(|v| v.as_array()) {
        if !Self::is_in_default_booster(booster_types) {
            return false;
        }
    } else {
        return false;  // <-- the brittle line
    }
    // ascii number check ...
    true
}
```

#### Proposed

```rust
const BOOSTER_BEARING_SET_TYPES: &[&str] = &[
    "expansion", "core", "draft_innovation", "masters", "funny",
];

const SPECIAL_FRAME_EFFECTS: &[&str] = &[
    "extendedart", "showcase", "fullart", "inverted", "etched",
];

pub fn is_main_set_card(card_data: &Value, set_type: &str) -> bool {
    // promoTypes check - unchanged
    if let Some(promo_types) = card_data.get("promoTypes").and_then(|v| v.as_array()) {
        if !Self::has_canonical_promo_types(promo_types) {
            return false;
        }
    }

    // ascii number check - unchanged
    let set_code = card_data.get("setCode").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
    if let Some(number) = card_data.get("number").and_then(|v| v.as_str()) {
        if !number.is_ascii() && set_code != "arn" {
            return false;
        }
    } else {
        return false;
    }

    // boosterTypes path - if present, trust it
    if let Some(booster_types) = card_data.get("boosterTypes").and_then(|v| v.as_array()) {
        return Self::is_in_default_booster(booster_types);
    }

    // boosterTypes absent. Only apply intrinsic-signal fallback for set types
    // that are SUPPOSED to have boosters. Commander decks, duel decks, etc.
    // correctly have no boosterTypes because their cards never go in packs -
    // returning false for them preserves current behavior.
    if !BOOSTER_BEARING_SET_TYPES.contains(&set_type) {
        return false;
    }

    // Intrinsic-signal fallback (covers SOS-style new sets where MTGJSON
    // has not yet populated boosterTypes).
    let border = card_data.get("borderColor").and_then(|v| v.as_str());
    if let Some(b) = border {
        if b != "black" && b != "white" {
            return false;
        }
    }
    let frame_effects: Vec<&str> = card_data
        .get("frameEffects")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    if frame_effects.iter().any(|fe| SPECIAL_FRAME_EFFECTS.contains(fe)) {
        return false;
    }
    let availability: Vec<&str> = card_data
        .get("availability")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect())
        .unwrap_or_default();
    if !availability.is_empty() && !availability.contains(&"paper") {
        return false;
    }
    true
}
```

### File: `scry/src/card/mapper.rs`

The mapper needs `set_type` to pass through to the classifier. The MTGJSON `data` object has the set type at the top level, but `map_to_cards` currently only extracts the `cards` array.

#### Change `map_to_cards` to capture set type and pass it through

```rust
pub fn map_to_cards(set_data: Value) -> Result<Vec<Card>> {
    let data_obj = set_data
        .get("data")
        .ok_or_else(|| anyhow::anyhow!("Invalid MTG JSON set structure"))?;
    let set_type = data_obj
        .get("type")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let cards_array = data_obj
        .get("cards")
        .and_then(|c| c.as_array())
        .ok_or_else(|| anyhow::anyhow!("Invalid MTG JSON set structure"))?;

    cards_array
        .iter()
        .filter(|c| !c.get("isOnlineOnly").and_then(|v| v.as_bool()).unwrap_or(false))
        .map(|card_data| Self::map_json_to_card(card_data, &set_type))
        .collect()
}

pub fn map_json_to_card(card_data: &Value, set_type: &str) -> Result<Card> {
    // ... existing extraction ...
    let in_main = MainSetClassifier::is_main_set_card(card_data, set_type);
    // ... rest unchanged ...
}
```

### Tests to add in `main_set_classifier.rs`

| Scenario | set_type | Expected `in_main` |
|---|---|---|
| Expansion card, no boosterTypes, plain black border, no special FE | `"expansion"` | `true` (the SOS case) |
| Expansion card, no boosterTypes, borderless | `"expansion"` | `false` |
| Expansion card, no boosterTypes, frameEffects=[extendedart] | `"expansion"` | `false` |
| Expansion card, no boosterTypes, availability=[mtgo] | `"expansion"` | `false` |
| Commander card, no boosterTypes, plain black border | `"commander"` | `false` (precon products stay out) |
| Masters card, no boosterTypes, plain black border | `"masters"` | `true` (masters has boosters) |
| Existing tests | various | unchanged - the boosterTypes-present path is preserved |

### What you can verify after Phase 1 deploys

After re-ingest:

```sql
-- Was 0, expect ~281
SELECT base_size FROM "set" WHERE code = 'sos';

-- Was 0, expect ~260
SELECT base_size FROM "set" WHERE code = 'tmt';

-- Should stay 0 (commander decks unaffected)
SELECT base_size FROM "set" WHERE type = 'commander';
```

---

## Phase 2 - set-level `is_main` derivation

### Discovery

`parent_code` already exists on `set` (both scry's schema and iwmm's `001_complete_schema.sql:238`) and scry already populates it during ingest (`set/mapper.rs` -> `set/repository.rs`). There's even an `update_parent_codes()` function (`set/repository.rs:308`) that fixes some MTGJSON inconsistencies after ingest. **No schema change required for Phase 2.**

Current state in DB confirms the column is live and correct for MTGJSON-tagged cases:

| code | parent_code | is_main now |
|---|---|---|
| big | otj | false (only because base_size=0) |
| tsb | tsp | **true** (currently counted as main - wrong) |
| mat | NULL | true (MTGJSON didn't tag, will need override) |
| otj | NULL | true (correct) |

### File: `scry/src/set/repository.rs`

#### Change `update_is_main()`

Current (line 408-414):

```rust
pub async fn update_is_main(&self) -> Result<i64> {
    let qb = QueryBuilder::new(
        "UPDATE \"set\" SET is_main = (base_size > 0 AND type != 'masterpiece')
        WHERE is_main IS DISTINCT FROM (base_size > 0 AND type != 'masterpiece')",
    );
    self.db.execute_query_builder(qb).await
}
```

Proposed:

```rust
const BONUS_EXPANSION_OVERRIDES: &[&str] = &[
    "mat",  // March of the Machine: The Aftermath
    // Add entries here when MTGJSON misses a parent_code for a bonus mini-set.
    // Document each entry with a brief note explaining why it's bonus.
];

pub async fn update_is_main(&self) -> Result<i64> {
    let overrides_sql = if BONUS_EXPANSION_OVERRIDES.is_empty() {
        String::new()
    } else {
        let list = BONUS_EXPANSION_OVERRIDES.iter()
            .map(|c| format!("'{}'", c))
            .collect::<Vec<_>>()
            .join(",");
        format!(" AND code NOT IN ({})", list)
    };
    let derived = format!(
        "(type IN ('expansion','core') AND parent_code IS NULL{})",
        overrides_sql
    );
    let qb = QueryBuilder::new(format!(
        "UPDATE \"set\" SET is_main = {derived}
        WHERE is_main IS DISTINCT FROM {derived}"
    ));
    self.db.execute_query_builder(qb).await
}
```

Notes:
- The override list values are hard-coded set codes, not user input, so string interpolation here is safe. Keep it that way - never plumb user input through this path.
- `parent_code` is already lowercase in the DB; keep overrides lowercase to match.

### Behavior change summary

| Set | Before | After |
|---|---|---|
| Standard expansions (OTJ, MOM, BRO, ...) | is_main=true | is_main=true |
| Core sets (FDN, M21, ...) | is_main=true | is_main=true |
| SOS, TMT, MSH (current data-lag victims) | is_main=false | **is_main=true** (because Phase 1 will give them base_size > 0, and they pass Phase 2's rule) |
| BIG (parent_code=otj) | is_main=false (incidentally, base_size=0) | is_main=false (now correctly excluded by rule, not by accident) |
| TSB (parent_code=tsp) | **is_main=true (wrong)** | **is_main=false (fixed)** |
| MAT (no parent_code in MTGJSON) | is_main=true | is_main=false (caught by override list) |
| FBB, FWB, 4BB (foreign reprints with parent_code) | is_main=false (incidentally) | is_main=false (correctly excluded) |
| Modern Horizons 1/2/3, Commander Legends, etc. | is_main=true (draft_innovation) | **is_main=false** |
| Un-sets (UNF, UST, UNH, UGL) | is_main=true (funny) | **is_main=false** |
| Portal sets (POR, P02, PTK, S99) | is_main=true (starter) | **is_main=false** |
| Masterpieces (MUL, EXP, MPS, MP2) | is_main=false | is_main=false |
| Commander decks, duel decks, FTV, etc. | is_main=false | is_main=false |

Modern Horizons / Un-sets / Portal flipping off is the visible UX change. Phase 3 (user-controlled set-type filter) brings them back as user preference. We're accepting the brief UX gap between Phase 2 ship and Phase 3 ship in exchange for getting "is this main?" out of the codebase entirely.

### What you can verify after Phase 2 deploys

```sql
-- Should now be false (was true)
SELECT is_main FROM "set" WHERE code IN ('tsb','mat','mh3','unf','por');

-- Should now be true (was false, was being held back by base_size=0)
SELECT is_main FROM "set" WHERE code IN ('sos','tmt','msh');

-- Should still be true
SELECT is_main FROM "set" WHERE code IN ('otj','bro','mom','fdn');
```

---

## Sequencing and rollout

1. **Ship Phase 1 first.** It's self-contained, lower risk, and unblocks the SOS user complaint. Phase 2 depends on Phase 1 having run (because the new Phase 2 rule for SOS only produces `is_main=true` once SOS has base_size > 0, which Phase 1 provides).
2. After deploying Phase 1, run a full re-ingest (`scry ingest`) so every set re-runs the classifier. Verify the queries above.
3. **Ship Phase 2.** Run `scry post-ingest-updates` (or whatever step calls `update_is_main`) - the SQL is idempotent and only updates rows where the value changes. Verify the queries above.
4. Spot-check iwmm's set browse / search / detail pages for SOS, BIG, MAT, MH3 to confirm UI behaves as expected.

## Risks and how to mitigate

- **A new Wizards set type lands in MTGJSON.** Phase 1's `BOOSTER_BEARING_SET_TYPES` allowlist won't include it; cards in that set could stay at in_main=false. Mitigation: monitor base_size on new ingests; one-line allowlist addition + redeploy.
- **A new bonus mini-set gets a missing parent_code from MTGJSON.** Phase 2 won't catch it without an override. Mitigation: visual review of new expansions post-release; add to `BONUS_EXPANSION_OVERRIDES`.
- **Modern Horizons fans complain about MH3 dropping off main listings.** Mitigation: Phase 3 (user-controlled filter) restores it via preference. Or temporarily include `draft_innovation` in Phase 2's set-type list.
- **Existing user inventory rows referencing variant cards.** No data is migrated; `card.in_main` updates in place. Existing inventory references the same `card.id`, so nothing breaks - only the displayed "Bonus" tag and pricing rollups recompute.

## Out of scope for these phases

- User-controlled set-type filtering (Phase 3)
- Renaming or repurposing the `is_main` API field
- UI changes to surface parent/child set relationships
- Migration of any inventory data

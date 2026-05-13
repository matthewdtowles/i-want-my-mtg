# `in_main` Classifier Refactor

**Status:** Shipped (scry `5.11.0`, iwmm `1.23.0`).

## Problem

Two issues with how main-set membership was being classified:

1. **Card-level (`card.in_main`):** scry's classifier hard-required MTGJSON's `boosterTypes` field. MTGJSON doesn't populate it promptly for newly-released sets, so `base_size` was `0` for recent expansions (SOS, TMT, MSH, BIG).
2. **Set-level (`set.is_main`):** scry derived `is_main` from `base_size > 0 AND type != 'masterpiece'`. Bonus-sheet sets that MTGJSON types as `expansion` (BIG, TSB, MAT) leaked into main listings.

## Solution

Three phases, all shipped:

### Phase 1 — card classifier fallback (scry)

`src/card/domain/main_set_classifier.rs`. When `boosterTypes` is absent, fall back to intrinsic per-card signals (`borderColor`, `frameEffects`, `availability`), gated to booster-bearing set types only (`expansion`, `core`, `draft_innovation`, `masters`, `funny`). Prevents commander decks and other non-booster products from being falsely classified.

### Phase 2 — set-level rule (scry)

`src/set/repository.rs::update_is_main`. Final rule:

```sql
is_main = (type IN ('expansion','core') AND code NOT IN BONUS_EXPANSION_OVERRIDES)
```

The override list (`big`, `mat`, `tsb`) is the authoritative source. Block-children (Dark Ascension, Eldritch Moon, Born of the Gods, Stronghold, …) stay `is_main=true` — they are full block expansions, not bonus sheets, even though scry's `update_parent_codes` later stamps a parent code on them.

The rule is intentionally order-independent w.r.t. `update_parent_codes` (regression-tested in `tests/set_repository_test.rs::test_update_is_main_order_independent`).

### Phase 3 — user preference (iwmm)

`users.included_set_types text[]` (nullable). Signed-in users can override the default `is_main` filter via the "Set Types To Show" section on `/user`. Default for anonymous + uncustomized users is `is_main = true`.

- Primary group (8 types in UI): expansion, core, draft_innovation, masters, commander, duel_deck, funny, starter.
- Advanced group (12 types behind a `<details>` disclosure): the rest.
- `GET`/`PUT /api/v1/user/preferences/set-types` with allowlist validation (max 25, only known types, dedup).
- `SafeQueryOptions.withSetTypes()` mirrors the existing `withBaseOnly()` pattern.

## Adding a new bonus sheet

When a new bonus-sheet set ships and MTGJSON labels it `type=expansion`, add its lowercase code to `BONUS_EXPANSION_OVERRIDES` in `scry/src/set/repository.rs` with a comment explaining what it is. Ship a scry release.

Audit query for candidate bonus sheets in the current DB:

```sql
SELECT code, name, base_size, total_size, is_main,
       base_size::float / NULLIF(total_size,0) AS ratio
FROM "set"
WHERE type IN ('expansion','core') AND total_size > 0
ORDER BY ratio ASC LIMIT 20;
```

A low base-to-total ratio is a heuristic — anything with `is_main=true` that looks like an insert sheet is a candidate.

## Open follow-up

Should `type = draft_innovation` sets (Modern Horizons 1–3) be in default browse? They are full-size draftable expansions in everything but MTGJSON's type label. Currently they're excluded from `is_main` and only appear if the user enables `draft_innovation` in the Phase 3 preference. Decide before declaring Phase 3 done.

## See also

- [`post-ingest-audit.md`](post-ingest-audit.md) — diagnostic record of the ordering bug that led to the order-independent rewrite, kept for reference.

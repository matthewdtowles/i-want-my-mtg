# Post-Ingest Audit: `is_main` Classifier State

**Date:** 2026-05-12 (updated 2026-05-13 with implemented fix)
**Status:** Resolved by scry branch `in-main-rule-fix` (PR pending). Rule rewritten to be order-independent.

## Summary

After the most recent ingestion (run against scry `classifier-refactor`), 69 sets in the iwmm database have `parent_code IS NOT NULL AND is_main = true`, in apparent violation of the documented Phase 2 rule. Investigation found a step-ordering bug in scry's post-ingest pipeline that produces this result — **but the result itself is what we actually want.** The strict `parent_code IS NULL` rule was over-broad: it would have excluded ~60 legitimate block-child expansions (Stronghold, Exodus, Dark Ascension, Eldritch Moon, …) that are full members of their Standard-era blocks. The intent of Phase 2 was always to filter bonus *sheet* sets (BIG, TSB, MAT, …) that MTGJSON mistypes as `expansion`. Block-children were never the target. The recommendation is therefore to amend the spec to match the better-than-documented behavior the ordering bug accidentally produces, not to "fix" the bug.

## Documented vs. actual

The Phase 2 rule (`src/set/repository.rs:421` in scry, branch `classifier-refactor`):

```
is_main = (type IN ('expansion','core') AND parent_code IS NULL AND code NOT IN ('mat'))
```

Observed in iwmm DB after ingest:

| Category | Spec says | DB shows | What we actually want |
|---|---|---|---|
| Block-child expansions (EMN, AVR, DKA, BNG, JOU, …) | `false` | `true` | **`true`** — these are full block expansions |
| Historical core sets (M14, 2ED, 5ED, 10E, …) | `false` (parent=`lea`) | `true` | **`true`** — core sets are main |
| Foundations (FDN, parent=`lea`) | `false` | `true` | **`true`** — full standalone-ish core set |
| BIG (parent=`otj`) — bonus sheet inside OTJ | `false` | `false` | `false` ✓ |
| TSB (parent=`tsp`) — Time Spiral Timeshifted bonus sheet | `false` | `false` | `false` ✓ |
| MAT (override) — MOM epilogue mini-set | `false` | `false` | `false` ✓ |
| Standalone modern expansions (SOS, TMT, ECL, …) | `true` | `true` | `true` ✓ |
| MSH (release_date in future, no card signals yet) | `true`, `base_size=0` | `true`, `base_size=0` | acceptable (self-resolves) |

Net result: the 69 "violations" are all sets that SHOULD be `is_main = true`. The spec is too aggressive; the DB is closer to right.

Verification query:

```sql
SELECT COUNT(*) FROM "set" WHERE parent_code IS NOT NULL AND is_main = true;
-- Expected per spec: 0
-- Actual: 69
```

## Root cause

`scry/src/cli/controller.rs:684–689` runs post-ingest set updates in this order:

```
1. update_sizes(...)            -- base_size / total_size
2. update_main_status()         -- strict is_main rule evaluates HERE
3. update_parent_codes()        -- block-child parent_code assigned HERE
```

`update_parent_codes()` step 3 stamps `parent_code` onto block-child expansions (Eldritch Moon → `isd`, Dark Ascension → `isd`, every core set → `lea`, etc.) using a `WITH canonical AS (…)` CTE. This runs *after* `update_main_status()`, so when the strict rule evaluates `parent_code IS NULL`, those sets still have `parent_code = NULL` from the upsert and slip through as `is_main = true`.

Only two paths currently flip a set to `is_main = false`:

1. MTGJSON natively populated `parentCode` at upsert time (catches BIG → `otj`, TSB → `tsp`).
2. The set code is in the hardcoded `BONUS_EXPANSION_OVERRIDES` constant (catches MAT).

Every other intended exclusion — Modern Horizons, Un-sets, Portal, all block-child expansions, all historical core sets — fails to flip because their `parent_code` is populated by scry itself one step too late.

## Implications

- **Phase 2 spec is wrong, not the ingestion.** On reflection, the strict `parent_code IS NULL` rule discards too much. For roughly twenty years (Tempest 1997 through Ixalan 2017–18), MTG shipped in *blocks*: one large set plus one or two smaller sets, all part of the same storyline and Standard rotation. Those follow-on sets (Stronghold, Exodus, Dark Ascension, Eldritch Moon, Born of the Gods, Journey into Nyx, Rivals of Ixalan, …) are full expansions in every meaningful sense and should remain in `is_main`. The goal of Phase 2 was always to filter out *bonus sheet* sets — Special Guests, Multiverse Legends, The Big Score, Time Spiral Timeshifted, the March of the Machine: Aftermath epilogue — which MTGJSON misclassifies as `type = expansion` despite being insert sheets attached to a parent product. Block-child expansions are not bonus sheets and were never the target.
- **Current DB state is closer to correct than the spec.** The ordering bug accidentally produces nearly the right outcome: bonus sheets with MTGJSON-native `parentCode` (BIG, TSB) and the override (MAT) flip off; legitimate block expansions stay on. The bug is real, but the *result* is acceptable.
- **Phase 3 UX testing is partially invalidated.** The documented flow ("user opts in to draft_innovation to see MH3 again") doesn't trigger because MH3 is `draft_innovation`, not `expansion`, so it was already excluded by the type filter rather than the parent_code rule. That side of Phase 3 still needs validation. The historical block-children flow ("user wants to hide block-children") was never a real requirement — those should stay visible by default.
- **Spec, code, and DB are now three-way inconsistent.** Even if the practical behavior is acceptable, the documented rule, the deployed rule, and the observed DB state all disagree. That's a maintenance hazard.

## Resolution

Implemented in scry branch [`in-main-rule-fix`](https://github.com/matthewdtowles/scry/tree/in-main-rule-fix). The rule was rewritten to drop the `parent_code` dependency entirely and rely on the override list as the authoritative bonus-sheet filter:

```sql
is_main = (type IN ('expansion','core') AND code NOT IN (BONUS_EXPANSION_OVERRIDES))
```

`BONUS_EXPANSION_OVERRIDES` now contains `big`, `mat`, `tsb`. Adding to the list is the only mechanism for excluding future bonus sheets; there is no longer an implicit parent_code-based detector that depends on execution order.

### Why this over the alternatives

- **Order-independent.** No matter when `update_parent_codes()` runs relative to `update_is_main()`, the result is the same. The prior accidental coupling is gone.
- **No schema change.** Considered adding a separate `mtgjson_parent_code` column. Rejected because the override list already covers the cases we need (MTGJSON's native `parentCode` is unreliable for the historically-tricky bonus sheets like TSB and MAT anyway), and avoiding a migration on both repos is worth the trade-off.
- **Same data outcome.** Production result after re-ingest: 134 main sets (112 expansion + 22 core), same 3 bonus sheets excluded. Block-children, historical cores, FDN all preserved as `is_main=true`. No external API contract change.

### Verification (after running scry from `in-main-rule-fix`)

```sql
-- Main count by type — only expansion/core should appear
SELECT type, COUNT(*) FILTER (WHERE is_main) AS n FROM "set" GROUP BY type ORDER BY n DESC;
-- Expect: expansion=112, core=22, everything else 0

-- Bonus sheets stay out
SELECT code, is_main FROM "set" WHERE code IN ('big','tsb','mat');
-- Expect: all false

-- Block-children stay in
SELECT code, is_main FROM "set" WHERE code IN ('emn','dka','avr','bng','jou','frf','m14','2ed','fdn','sos','msh');
-- Expect: all true
```

### Tests added

`tests/set_repository_test.rs`:

- `test_update_is_main_block_children_stay_main` — canonical + block-child both stay `is_main=true`
- `test_update_is_main_bonus_overrides` — `big`, `tsb`, `mat` all flip false
- `test_update_is_main_non_expansion_types_excluded` — `commander`, `draft_innovation`, `masterpiece`, `promo`, `funny`, `starter`, `duel_deck`, `masters` never become main
- `test_update_is_main_order_independent` — same result whether `update_parent_codes` runs before or after `update_is_main` (regression guard)

All 12 set integration tests pass; full scry test suite (98 unit + integration) passes; `run-local.sh ingest` against the dev DB produces the expected post-ingest state documented above.

### Follow-ups

- **Walk the override list** when new bonus sheets ship. Audit query for candidates (any `expansion`/`core` set with low base-to-total ratio):

  ```sql
  SELECT code, name, base_size, total_size, is_main,
         base_size::float / NULLIF(total_size,0) AS ratio
  FROM "set"
  WHERE type IN ('expansion','core') AND total_size > 0
  ORDER BY ratio ASC LIMIT 20;
  ```

- **Out-of-scope question for Phase 3:** Modern Horizons sets are `type = draft_innovation`. Under the current rule they're excluded from default browse. They are full-size, draftable expansions in everything but MTGJSON type. Decide before Phase 3 ships whether they should be `is_main = true` (via an additional rule clause or a `MAIN_EXPANSION_INCLUDES` whitelist) or stay opt-in via the user preference. Current behavior preserves the documented Phase 3 UX.

## Out-of-scope observations

- **MSH (Marvel Super Heroes)** has `base_size=0`, `total_size=24`, `is_main=true`. Release date is 2026-06-26 (future). MTGJSON has not populated `boosterTypes` and the intrinsic-signal fallback found no qualifying cards in the 24-card sample. This is the exact Phase 1 scenario; it will self-resolve when MTGJSON updates. No action needed unless empty-base sets in main listings become a UX problem, in which case suppress sets where `is_main = true AND base_size = 0` at the orchestrator layer.
- **Cards with `in_main = true` inside sets with `is_main = false`** exist by design (J22, MH1–3, UNF, etc.) and total ~4,500. This is correct — card-level `in_main` is independent of set-level filtering. Any query that joins `card.in_main` without filtering on `set.is_main` will leak these cards into "main" results. Worth a grep audit of repository methods that filter on `card.in_main` alone.

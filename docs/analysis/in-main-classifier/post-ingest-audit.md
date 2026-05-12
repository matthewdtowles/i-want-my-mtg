# Post-Ingest Audit: `is_main` Classifier State

**Date:** 2026-05-12
**Status:** scry-side ordering bug identified; fix required before Phase 2/3 spec can be honored

## Summary

After the most recent ingestion (run against scry `classifier-refactor`), 69 sets in the iwmm database have `parent_code IS NOT NULL AND is_main = true`, in direct violation of the documented Phase 2 rule. Root cause is a step-ordering bug in scry's post-ingest pipeline, not a defect in the rule itself.

## Documented vs. actual

The Phase 2 rule (`src/set/repository.rs:421` in scry, branch `classifier-refactor`):

```
is_main = (type IN ('expansion','core') AND parent_code IS NULL AND code NOT IN ('mat'))
```

Observed in iwmm DB after ingest:

| Category | Expected | Actual |
|---|---|---|
| Block-child expansions (EMN, AVR, DKA, BNG, JOU, …) | `is_main=false` | `is_main=true` |
| Historical core sets (M14, 2ED, 5ED, 10E, …) | `is_main=false` (parent=`lea`) | `is_main=true` |
| Foundations (FDN, parent=`lea`) | `is_main=false` | `is_main=true` |
| BIG (parent=`otj`) | `is_main=false` | `is_main=false` |
| TSB (parent=`tsp`) | `is_main=false` | `is_main=false` |
| MAT (override) | `is_main=false` | `is_main=false` |
| Standalone modern expansions (SOS, TMT, ECL, …) | `is_main=true` | `is_main=true` |
| MSH (release_date in future, no card signals yet) | `is_main=true`, `base_size=0` | `is_main=true`, `base_size=0` |

Net deviation: 69 sets flagged `is_main=true` that the spec says should be `false`.

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

- **Phase 2 spec is not honored.** HANDOFF.md and `phase-1-and-2-spec.md` describe a strict rule that flips Modern Horizons, Un-sets, Portal, and all block-child expansions to `is_main = false`. None of that happened.
- **Phase 3 UX testing is invalidated.** The documented UX flow ("user opts in to draft_innovation to see MH3 again") cannot be validated because MH3 is currently still in `is_main = true` and shows up in default listings without any user preference.
- **Practical user impact is mild.** Current behavior is closer to user intuition (block-child expansions stay visible) than the strict spec would have been. No external API contract is broken — `is_main` field semantics are unchanged.
- **Override list is hiding the bug.** As long as MAT is in the constant, it looks like the rule works. Without auditing all 69 sets, future maintainers will assume the strict rule is enforced when it is not.

## Recommendation

### Primary fix (scry-side, one-line)

Reorder `scry/src/cli/controller.rs:684–689` so `update_parent_codes()` runs **before** `update_main_status()`:

```rust
// before: sizes → is_main → parent_codes
// after:  sizes → parent_codes → is_main
```

This is a one-line reorder. After the fix, the strict rule evaluates against a complete `parent_code` column and flips all 69 block-children correctly.

### Caveat: `update_parent_codes` reads `is_main`

`update_parent_codes()` step 3 picks a "canonical parent" per block using `WHERE is_main = true` (see `set/repository.rs:347–360`). If `is_main` has not yet been computed for a fresh DB, this query has nothing to pick from. Two safe options:

- **Option A (preferred):** Call `update_main_status()` twice — once before `update_parent_codes()` (seeds canonical selection with the looser pre-parent-code state), once after (applies the strict filter against complete data). Both calls are idempotent; cost is one extra UPDATE on the set table.
- **Option B:** Reorder as above and accept that on a truly fresh DB the first ingest may misclassify block-children for one run. Subsequent ingests converge.

Option A is recommended — it is unambiguous and handles fresh DBs correctly on the first ingest.

### Rollout

1. Apply the fix as a follow-up commit on scry's `classifier-refactor` branch before merging.
2. Re-run a single ingest. Both `update_main_status` calls are idempotent.
3. Verify:

   ```sql
   SELECT COUNT(*) FROM "set" WHERE parent_code IS NOT NULL AND is_main = true;
   -- Expect: 0

   SELECT COUNT(*) FILTER (WHERE is_main) FROM "set" WHERE type = 'expansion';
   -- Expect: ~50 (only canonical block parents + modern standalone expansions)
   ```

4. Manually spot-check that Modern Horizons (MH1/MH2/MH3), Un-sets (UNF/UST), and Portal sets now flip to `is_main = false`. Validate the Phase 3 UX flow against this corrected baseline.

### Alternative: amend the spec

If the current observed behavior (block-children stay in main) is preferred over the strict spec, the alternative is to revise HANDOFF.md and `phase-1-and-2-spec.md` to document a softer rule. This is the cheaper path operationally but leaves the system in a state where the code and docs disagree and where the eventual order-fix would silently flip 69 sets out of `is_main`. Not recommended.

## Out-of-scope observations

- **MSH (Marvel Super Heroes)** has `base_size=0`, `total_size=24`, `is_main=true`. Release date is 2026-06-26 (future). MTGJSON has not populated `boosterTypes` and the intrinsic-signal fallback found no qualifying cards in the 24-card sample. This is the exact Phase 1 scenario; it will self-resolve when MTGJSON updates. No action needed unless empty-base sets in main listings become a UX problem, in which case suppress sets where `is_main = true AND base_size = 0` at the orchestrator layer.
- **Cards with `in_main = true` inside sets with `is_main = false`** exist by design (J22, MH1–3, UNF, etc.) and total ~4,500. This is correct — card-level `in_main` is independent of set-level filtering. Any query that joins `card.in_main` without filtering on `set.is_main` will leak these cards into "main" results. Worth a grep audit of repository methods that filter on `card.in_main` alone.

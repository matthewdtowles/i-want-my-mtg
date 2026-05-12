# Post-Ingest Audit: `is_main` Classifier State

**Date:** 2026-05-12
**Status:** Phase 2 spec needs revision; deployed behavior is closer to correct than the spec describes

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

## Recommendation

The right fix is **not** to enforce the strict spec by reordering scry's pipeline. That would incorrectly remove ~60 legitimate block expansions from default listings. Instead, amend the rule to target what we actually want to filter: bonus sheets posing as expansions.

### Primary recommendation: amend the rule to a bonus-sheet detector

Replace the strict `parent_code IS NULL` clause with a bonus-sheet predicate. Two candidate signals:

1. **Native MTGJSON `parentCode`.** Bonus sheets attached to a parent product (BIG → OTJ, TSB → TSP) have `parentCode` populated by MTGJSON directly at upsert time. Block-children do *not* — their `parent_code` is only assigned later by scry's own canonical-parent normalization. The distinction is already there in the data; the rule just needs to read `parent_code` *before* scry's normalization overwrites it, or read from a separate column.
2. **Override list.** The existing `BONUS_EXPANSION_OVERRIDES` constant covers the MTGJSON gaps (currently `mat`; would extend to whatever else MTGJSON misses).

Concretely, two implementation paths:

- **Path A — preserve the ordering bug intentionally.** Keep `update_main_status()` running before `update_parent_codes()`. Document this ordering as load-bearing: "is_main evaluates against MTGJSON-native parent_code only; scry's canonical-parent assignment runs after and does not feed back into is_main." Rename the variables or add a comment so the next maintainer doesn't 'fix' the order. This is essentially formalizing the current accidental behavior.
- **Path B — separate the two concepts in the schema.** Add a distinct column (`mtgjson_parent_code`, populated only from the raw MTGJSON field) and have `update_main_status` read from that. `parent_code` continues to hold scry's normalized canonical-parent value and is used by application queries. Cleaner long-term but a larger change (migration on both sides).

Path A is the lower-cost option. Path B is the right shape if this surface keeps growing.

### Rollout for Path A

1. In scry `classifier-refactor`, add a comment block above `update_main_status()` and above the `update_parent_codes()` / `update_main_status()` calls in `cli/controller.rs` documenting that the ordering is intentional and explaining why.
2. Amend `phase-1-and-2-spec.md` and the HANDOFF: the rule's intent is "bonus-sheet sets out, block-child expansions in." Document that `parent_code IS NULL` is evaluated against MTGJSON-native parentCode only (i.e., before scry's normalization step writes block-canonical parents).
3. Audit the `BONUS_EXPANSION_OVERRIDES` list. Walk every `type='expansion'` set in the DB and decide whether any others (besides MAT) are bonus sheets that MTGJSON failed to mark with a parentCode. Likely additions to check: any older insert-sheet products, `MUL` (Multiverse Legends — attached to MOM), `SLD` derivatives.
4. Verify with:

   ```sql
   -- Bonus sheets that should NOT be in main
   SELECT code, name, parent_code, base_size, total_size, is_main
   FROM "set"
   WHERE type IN ('expansion','core')
     AND total_size > 0
     AND base_size::float / total_size < 0.5
   ORDER BY base_size::float / total_size ASC;
   ```

   The low base/total ratio is a heuristic for bonus sheets. Any rows here with `is_main = true` are candidates for the override list.

5. Re-run a single ingest to apply any override additions. Spot-check that legitimate block expansions (EMN, AVR, DKA, BNG, JOU, RIX) stay `is_main = true` and bonus sheets stay `is_main = false`.

### Out-of-scope question worth answering

The bigger philosophical question: should Modern Horizons sets (`type = draft_innovation`) be in default browse, or hidden behind the Phase 3 opt-in? They are full-size, draftable expansions in everything but MTGJSON type. Currently they are hidden — that's correct under the spec but may be wrong for users. Worth deciding before Phase 3 ships.

## Out-of-scope observations

- **MSH (Marvel Super Heroes)** has `base_size=0`, `total_size=24`, `is_main=true`. Release date is 2026-06-26 (future). MTGJSON has not populated `boosterTypes` and the intrinsic-signal fallback found no qualifying cards in the 24-card sample. This is the exact Phase 1 scenario; it will self-resolve when MTGJSON updates. No action needed unless empty-base sets in main listings become a UX problem, in which case suppress sets where `is_main = true AND base_size = 0` at the orchestrator layer.
- **Cards with `in_main = true` inside sets with `is_main = false`** exist by design (J22, MH1–3, UNF, etc.) and total ~4,500. This is correct — card-level `in_main` is independent of set-level filtering. Any query that joins `card.in_main` without filtering on `set.is_main` will leak these cards into "main" results. Worth a grep audit of repository methods that filter on `card.in_main` alone.

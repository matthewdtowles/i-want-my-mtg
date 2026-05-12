# `in_main` Classifier Refactor - Analysis and Implementation Plan

**Date:** 2026-05-11
**Status:** specs ready for implementation

## Problem

`set.base_size = 0` for new expansions (SOS, TMT, MSH, BIG) when users expect it to reflect the count of "main" cards in the set. Root cause: the classifier (`scry/src/card/domain/main_set_classifier.rs`) hard-requires MTGJSON's `boosterTypes` field to contain `"default"`, and MTGJSON does not populate that field promptly. For SOS (released 2026-04-24), every card still has `boosterTypes: null` weeks after release.

Secondary problem: even with a fix, scry's set-level `is_main` derivation (`base_size > 0 AND type != 'masterpiece'`) is wrong about several edge cases - bonus mini-sets like `BIG` (a bonus inside Outlaws of Thunder Junction) and `MAT` (March of the Machine: The Aftermath) get classified as main expansions because their type happens to be `expansion`.

## Solution overview

Three phases, each independently deployable:

| Phase | Scope | Fixes |
|---|---|---|
| **Phase 1** | Card classifier in scry. Add fallback signals (borderColor, frameEffects, availability) when `boosterTypes` is absent. Gate the fallback on booster-bearing set types only. | SOS, TMT, MSH, BIG card counts. Prevents commander-deck explosion. |
| **Phase 2** | Set-level `is_main` SQL in scry. Use `parent_code IS NULL` + a small `BONUS_EXPANSION_OVERRIDES` constant to catch bonus mini-sets. | TSB, BIG, MAT correctly excluded from main listings. Modern Horizons / Un-sets / Portal flip off (acceptable - Phase 3 brings them back via user choice). |
| **Phase 3** | User preference for which set types appear in browse / search. Stored as `user.included_set_types text[]`. `NULL` falls back to `is_main` (Phase 2 default). | Users decide whether Modern Horizons, commander decks, etc. appear in their views. Removes the philosophical "is this main?" question from the codebase. |

Phase 1 and Phase 2 are scry-only changes with no schema migration (the `parent_code` column already exists and is already populated). Phase 3 is the larger iwmm-side feature.

## Implementation specs

- [Phase 1 + Phase 2 spec](phase-1-and-2-spec.md) - card classifier fix and set-level rule tightening
- [Phase 3 spec](phase-3-spec.md) - user-controlled set-type filter

## Methodology used during analysis

- Downloaded MTGJSON `AllPrintings.json.gz` (~166 MB compressed) to `/tmp/mtgjson-cache/`.
- Streamed the JSON with `ijson` to avoid loading the full payload into memory.
- For every set in the production DB (602 sets), ran both the current classifier and several proposed variants. Recorded `current_main`, `proposed_main`, exclusion reasons, and samples of newly-included or newly-excluded cards.
- Identified `parentCode` as the cleanest single signal for separating "real expansions" from "bonus mini-sets" - covers BIG, TSB, OM1, OM2, and the FBB/FWB/4BB foreign reprints automatically. Gaps in MTGJSON's `parentCode` data (MAT, possibly HOB and FRA pending release) become the override list.

## Headline analysis findings

- 425 of 602 sets show no change under the corrected card classifier.
- 177 sets see their `in_main` count change, all in the direction of MORE in_main cards (no card is ever removed by the new logic).
- The naive version of the fix (no set-type gating) would have added ~20,320 in_main cards across the DB - mostly by populating commander decks and other preconstructed products that should stay empty. The gated version (Phase 1) limits the change to set types that legitimately have boosters (~4,400 cards), and Phase 2 cleans up the set-level classifications.

## Critical decisions captured

- **Boundary between Phase 1 and Phase 2:** card-level vs set-level. They're separable; each fixes part of the problem.
- **Set-type allowlist for the card-level fallback:** `expansion`, `core`, `draft_innovation`, `masters`, `funny` - the types that actually ship in booster packs. Other types (commander, duel_deck, from_the_vault, ...) keep current behavior: `boosterTypes: null` correctly means "not in a booster pack."
- **Set-level rule:** `type IN ('expansion','core') AND parent_code IS NULL AND code NOT IN override_list`. Phase 2 flips `draft_innovation`, `funny`, `starter` off main listings; Phase 3 lets users opt them back in.
- **Override list location:** Rust constant in scry source. Start there; graduate to a DB column if the list grows past ~10 entries or you need to fix misclassifications without a release.

## Decisions locked in

1. **Phase 2 set-type list:** strict - `type IN ('expansion','core')` only. Modern Horizons, Un-sets, and Portal sets flip off main listings between Phase 2 ship and Phase 3 ship; users get them back via preference.
2. **Phase 3 settings UI:** curated primary group of 8 common set types, with an "Advanced" disclosure for the long-tail types. All types still accepted by the PUT validation - the UI tiering is presentation only.

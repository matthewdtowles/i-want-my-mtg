# Handoff: in_main Classifier Refactor

Snapshot of where this work stands so it can be picked up on another machine.

## State

All three phases are implemented, committed, and pushed. **Not yet merged, not yet deployed.** Branches are open for review.

| Repo | Branch | PR link |
|---|---|---|
| scry | `classifier-refactor` | https://github.com/matthewdtowles/scry/pull/new/classifier-refactor |
| iwmm | `in-main-classifier-refactor` | https://github.com/matthewdtowles/i-want-my-mtg/pull/new/in-main-classifier-refactor |

Neither PR has been opened yet - the push output gave the create-PR URLs.

## What's in each branch

### scry `classifier-refactor`

One commit: `Fix in_main classification for new sets and bonus mini-sets`

- `src/card/domain/main_set_classifier.rs` - signature now `is_main_set_card(card_data, set_type)`. When `boosterTypes` is absent, falls back to intrinsic per-card signals (borderColor, frameEffects, availability), but only for booster-bearing set types (`expansion`, `core`, `draft_innovation`, `masters`, `funny`). Precon products (`commander`, `duel_deck`, `from_the_vault`, etc.) stay at `false` when `boosterTypes` is absent. 13 new tests covering SOS / commander / borderless / extended-art / showcase / arena-only / masters / duel_deck / FTV.
- `src/card/mapper.rs` - extracts `data.type` and threads it to the classifier.
- `src/card/event_processor.rs` - streaming JSON parser captures `current_set_type` from the set's `type` field and passes it on.
- `src/set/repository.rs` - `update_is_main()` rewritten. New rule: `type IN ('expansion','core') AND parent_code IS NULL AND code NOT IN (BONUS_EXPANSION_OVERRIDES)`. Overrides constant currently lists `mat` (March of the Machine: The Aftermath).

All 98 existing scry unit tests pass. No DB schema change.

### iwmm `in-main-classifier-refactor`

One commit: `Add user-controlled set-type filter (Phase 3 of in_main refactor)`

- `migrations/033_user_set_type_preferences.sql` + matching update to `docker/postgres/init/001_complete_schema.sql` - `users.included_set_types text[]` (nullable).
- `src/database/user/user.orm-entity.ts`, `src/core/user/user.entity.ts`, `src/database/user/user.mapper.ts` - field plumbed end-to-end.
- `src/shared/constants/set-types.ts` - canonical set type list, default `['expansion','core']`, primary 8-type UI group, advanced group, validator.
- `src/core/query/safe-query-options.dto.ts` - `includedSetTypes` field + `withSetTypes()` helper (mirrors existing `withBaseOnly()`).
- `src/database/set/set.repository.ts` - new private `applyBaseFilter()`. When user has custom types: `type IN (:...)`. Empty array: `1 = 0` (no rows). Null/undefined: fall back to `is_main = true`.
- `src/http/hbs/set/set.controller.ts`, `src/http/hbs/home/home.controller.ts`, `src/http/api/set/set-api.controller.ts` - inject `req.user?.includedSetTypes` into `SafeQueryOptions` via `withSetTypes()`.
- `src/core/user/user.service.ts` - new `updateSetTypePreference(userId, types)` that reads the existing user and overwrites only the preference field (avoids clobbering name/email/role/password).
- `src/http/api/user/user-api.controller.ts` + `dto/set-type-preference.dto.ts` - `GET /api/v1/user/preferences/set-types` and `PUT` with allowlist validation (max 25, only known types, dedup).
- `src/http/hbs/user/user.orchestrator.ts` - builds `setTypePreference` view data (primary group of 8 + advanced group of 12, with selected counts).
- `src/http/views/user.hbs` - "Set Types To Show" section. "Use default" master checkbox grays out the fieldset. Primary checkboxes visible. Advanced types under a `<details>` disclosure that auto-opens if any advanced type is currently selected.
- `src/http/public/js/user-settings.js` - form handler PUTs `{types: null}` or `{types: [...]}`.

`npx tsc --noEmit` clean. All 1054 unit tests pass.

## Decisions locked in (don't relitigate without good reason)

- **Phase 2 rule is strict.** `type IN ('expansion','core') AND parent_code IS NULL AND code NOT IN overrides`. Modern Horizons / Un-sets / Portal flip off `is_main`; Phase 3 user preferences bring them back if the user wants.
- **Phase 3 UI is curated, two-tier.** 8 primary types visible (expansion, core, draft_innovation, masters, commander, duel_deck, funny, starter). Other ~12 types live under an Advanced disclosure. The PUT endpoint accepts all known types either way.
- **Override list lives as a Rust constant** in scry (`BONUS_EXPANSION_OVERRIDES` in `src/set/repository.rs`), not a DB column. Graduates to a column only if the list grows past ~10 entries or you need to fix misclassifications without a release.
- **`is_main` API field semantics preserved.** It still means "is this set in the default filter set" - the meaning gets cleaner under the new rule, not different. External API consumers (RapidAPI) need no migration.

## Sequencing for rollout

Ship in this order. The two PRs are independent but coupled:

1. **scry first.** Merge, deploy, run a full re-ingest. Spot-check the verification queries below.
2. **iwmm shortly after.** Merge, deploy, run the migration. Without this, signed-in users won't have the settings UI to opt back into MH3 / UNF / etc.

If scry ships and iwmm lags more than a day or two, expect user-visible regressions in set listings until iwmm follows. Probably fine for the current user base, but worth flagging.

## Verification after scry deploy + re-ingest

```sql
-- Was 0, expect ~281
SELECT code, name, base_size, total_size, is_main FROM "set" WHERE code = 'sos';

-- Was 0, expect populated
SELECT code, name, base_size, is_main FROM "set" WHERE code IN ('sos','tmt','msh');

-- Should now be true
SELECT code, is_main FROM "set" WHERE code IN ('sos','tmt','msh','big','otj','bro');

-- Should now be FALSE for previously-main bonus mini-sets
SELECT code, name, is_main FROM "set" WHERE code IN ('big','tsb','mat');

-- Should still be FALSE (commander decks etc. unaffected)
SELECT type, COUNT(*) FILTER (WHERE is_main) FROM "set"
WHERE type IN ('commander','duel_deck','from_the_vault') GROUP BY type;

-- These should flip from true to false (now non-main under strict rule)
SELECT type, COUNT(*) FILTER (WHERE is_main) FROM "set"
WHERE type IN ('draft_innovation','funny','starter') GROUP BY type;
-- Expected: 0 across all three
```

## Verification after iwmm deploy

```sql
-- Migration applied
\d users
-- expect included_set_types text[] nullable column

-- Existing users untouched
SELECT COUNT(*) FROM users WHERE included_set_types IS NULL;
-- expect = total user count
```

Manual UX checks:
- Sign in, visit /user. New "Set Types To Show" section appears.
- "Use default" is checked; primary checkboxes are disabled and grayed.
- Uncheck "Use default", enable expansion + core + draft_innovation. Save.
- Navigate to /sets. Modern Horizons sets now appear in the listing.
- Toggle Advanced - reveals 12 more types.
- Re-check "Use default", save. Listings return to expansion+core only.

## Open / not-yet-done

- Open both PRs (URLs above).
- Code review.
- Merge scry, deploy, re-ingest.
- Merge iwmm, deploy.
- Consider a CHANGELOG entry for iwmm (project keeps one in repo root - see `CHANGELOG.md`).
- Both bumps are **minor** version: see README's headline analysis section and the conversation history for full reasoning. scry has no schema/API change, iwmm only adds (column, endpoints, UI).
- Decide whether to delete the `planning-updates` branch on iwmm if you're done with that work (it had unrelated CHANGELOG/ROADMAP edits that should land separately).

## Where to find more detail

- `docs/analysis/in-main-classifier/README.md` - problem statement and three-phase overview.
- `docs/analysis/in-main-classifier/phase-1-and-2-spec.md` - implementation spec used to build the scry changes.
- `docs/analysis/in-main-classifier/phase-3-spec.md` - implementation spec used to build the iwmm changes.

## To pick up on another machine

```bash
# scry
cd ~/projects/scry  # or wherever
git fetch origin
git checkout classifier-refactor
git pull

# iwmm
cd ~/projects/i-want-my-mtg
git fetch origin
git checkout in-main-classifier-refactor
git pull

# Local re-verification (optional)
cd ~/projects/scry && cargo test --lib
cd ~/projects/i-want-my-mtg && npm test
```

That's everything. The analysis JSON files (`/tmp/classifier_analysis.json`, `/tmp/affected_sets.json`) and the MTGJSON dump (`/tmp/mtgjson-cache/AllPrintings.json.gz`) are not committed and live only on the machine where the analysis ran - regenerable from the Python scripts referenced in `README.md`'s methodology section if needed.

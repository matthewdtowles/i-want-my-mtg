# Scry Codebase Analysis — Findings & Recommendations

**Date:** 2026-07-07
**Scope:** full `src/`, `tests/`, CI workflow, Dockerfile, scripts.
**Verification:** `cargo check --all-targets` (clean, 2 warnings), `cargo clippy` (~60 warnings), all 118 unit tests pass. SQL claims below were verified against the real PostgreSQL parser (libpg_query via `pglast`), not guessed.

Findings are grouped by severity. Each has a file/line reference and a concrete recommendation.

---

## 1. Correctness bugs (fix first)

### 1.1 `post-ingest-prune` as a standalone command silently never prunes foreign unpriced cards

`CardService` records foreign-card candidates in an **in-memory** `Arc<Mutex<Vec<String>>>` during ingest (`src/card/service.rs:29`, populated at `src/card/service.rs:151-160`), and `prune_foreign_unpriced` (`src/card/service.rs:305`) reads only that vector. When `cargo run -- post-ingest-prune` runs as its own process (as documented in CLAUDE.md and the interactive menu), the vector is empty, so the prune is a silent no-op — it only works when run inside the same process as a full ingest.

Root cause: `Card.language` is `#[sqlx(skip)]` (`src/card/domain/card.rs:41`), so foreignness cannot be re-derived from the DB.

**Recommendation:** persist the signal — either a `language` column or an `is_foreign` boolean on `card` — and have `prune_foreign_unpriced` query `card LEFT JOIN price` directly. That makes the prune idempotent, process-independent, and removes the shared-mutable-state field from the service entirely.

### 1.2 `DELETE FROM … CASCADE` does nothing — `CASCADE` is parsed as a table alias

`src/card/repository.rs:307-312` (`delete_table`: `DELETE FROM {} CASCADE`) and `src/set/repository.rs:276-279` (`DELETE FROM set CASCADE`). PostgreSQL's `DELETE` has no `CASCADE` clause; the parser accepts these statements only because `CASCADE` becomes the table **alias** (verified with libpg_query: `alias: {aliasname: 'cascade'}`). Nothing cascades.

Today it happens to work because `reset_data` (`src/cli/controller.rs:723`) deletes prices → cards → sets in dependency order. But:

### 1.3 `ingest -r` (reset) will hit FK violations once dependent tables have rows

The delete paths don't cover all FK dependents of `card`:

- `CardRepository::delete_all` (`src/card/repository.rs:273`) deletes `legality` then `card` — but `price_history`, `inventory`, and `granular_price_history` all reference `card(id)`, and per the schema mirror (`tests/fixtures/schema.sql`) `price_history` and `inventory` have **no** `ON DELETE CASCADE`. In production, `price_history` always has rows, so `DELETE FROM card` should fail.
- `PriceRepository::delete_all` (`src/price/repository.rs:129`) deletes only `price`, not `price_history` / `granular_price`.
- `delete_cards_batch` (`src/card/repository.rs:280`) deletes `legality`, `price`, `inventory` — but not `price_history` or `granular_price_history`, so cleanup/prune of a card that has history rows fails.
- `delete_set_batch` (`src/set/repository.rs:281`) has the same gap.

**Recommendation:** centralize "delete cards by id" in one place that handles the *complete* dependent-table list (or better: get `ON DELETE CASCADE` added in the web repo's migrations and delete only from `card`). For `reset`, `TRUNCATE card, legality, price, price_history, … CASCADE` in one statement is simpler, faster, and atomic. Add an integration test that deletes a card which has `price_history` rows — the current tests never exercise that path.

### 1.4 Streaming parser can spin forever on a persistent network failure

`src/utils/json_stream_parser.rs:67-98`: when `fill_buf()` returns `Err`, the code logs once, breaks out of the fill loop, and `next_event()` returns `NeedMoreInput` again — which `handle_parse_event` treats as `Ok(true)` (line 113), so the outer loop calls `get_next_event` again, `fill_buf` fails again, and so on. `error_count` only increments for *parser* errors, never for feeder/IO errors. A connection dropped mid-download (a 200 MB file over ~minutes — it will happen) becomes a silent busy-loop instead of an error.

Also in the same function: the fill loop on success always performs 3 `fill_buf` calls regardless of whether data arrived (`fill_attempts >= 3` with `continue` on every `Ok`), which is wasted work and suggests the retry logic doesn't do what was intended.

**Recommendation:** propagate feeder IO errors as hard failures (return `Err` from `get_next_event`), and fill until `next_event()` stops returning `NeedMoreInput` or EOF rather than a fixed 3 attempts. Separately, reconsider "tolerate 10 parser errors and continue" (`json_stream_parser.rs:135-147`): after a real tokenizer error actson's state is not trustworthy; the safer behavior is to abort on the first parse error.

### 1.5 Interactive prompts `.unwrap()` — panics in non-TTY environments

`src/cli/controller.rs:513-517`, `540-546`, `724-728`: `Confirm::new()…interact().unwrap()`. In cron/Docker (how this tool actually runs in production per CLAUDE.md), stdin is not a TTY and `interact()` returns `Err` → panic with a backtrace instead of a clean message. `truncate-history`, `backfill --truncate`, and `ingest -r` are all affected.

**Recommendation:** handle the `Err` as "not confirmed" with a clear log line ("non-interactive session: refusing destructive operation without --yes"), and/or add a `--yes` flag for scripted use. Elsewhere the same file already handles dialoguer errors gracefully (`interactive_mode` line 138-143) — make it consistent.

### 1.6 Split-card mana-cost merge is batch-local

`merge_and_filter_cards` (`src/card/service.rs:444`) can only merge a split card's faces if both are in the same batch. During streaming ingest, batches flush every 500 cards mid-set (`src/card/event_processor.rs:146-148`), so a face pair straddling a batch boundary is silently not merged: side "b" is dropped by `should_filter`, and side "a" keeps a partial mana cost. Low frequency, invisible when it happens.

**Recommendation:** flush only on set boundaries (the processor already flushes at end of each set's `cards` array), or buffer side-"b" faces per set in the processor and attach them to the batch that carries the "a" face. A unit test with a face pair split across two batches would lock the behavior in.

### 1.7 Price rows can be written with a 1970-01-01 date

`PriceAccumulator::into_price` (`src/price/domain/price_accumulator.rs:59-64`) falls back to `1970-01-01` when the provider date is missing or unparseable. Epoch-dated rows would poison `price` (breaking `clean_up_prices`, which keeps only the max date — an epoch row is "old" so it gets deleted, but only *after* being written and counted) and `price_history` retention (kept forever if the 1st of the month).

**Recommendation:** return an error (or skip with a `warn!`) when no valid date was accumulated. Also note the accumulator sums `f64` and converts to `Decimal` at the end — fine for averaging retail prices, but if exactness ever matters, accumulate `Decimal` directly.

### 1.8 Divergent skip-state machines: card processor can wedge in skip mode

`SealedProductEventProcessor` clears `is_skipping_value` when the skipped value turns out to be a scalar (`src/sealed_product/event_processor.rs:39-45`); `CardEventProcessor` does not (`src/card/event_processor.rs:31-45`, `_ => {}`). If the card processor ever starts skipping at a field whose value is a scalar (the `json_depth >= 3 && current_set_code.is_none()` branch at `event_processor.rs:226-236` can do this), `is_skipping_value` stays `true` forever and the rest of the file is silently ignored. It happens not to trigger with today's MTGJSON shape — it's a landmine, and the two implementations having diverged is exactly how it was planted.

**Recommendation:** fix the card processor's scalar case to match the sealed one, then extract the shared skip logic (see §4.1).

### 1.9 Unknown rarity silently mapped to `common`

`src/card/mapper.rs:42-44`: `rarity_str.parse().unwrap_or(CardRarity::Common)`. When MTGJSON adds a rarity (it has before: `bonus`, `special`), every affected card is silently misclassified.

**Recommendation:** log a `warn!` with the unknown value (and ideally count them), so a feed change is visible instead of silent data corruption.

### 1.10 One bad card aborts a whole set in the `-k` path — but not in the streaming path

`CardMapper::map_to_cards` (`src/card/mapper.rs:23-31`) collects `Result`s, so a single card missing `scryfallId` fails the entire `ingest -k <set>` call. The streaming path (`event_processor.rs:150-155`) warns and continues per card. Two different error policies for the same operation.

**Recommendation:** make the set-cards path warn-and-skip per card like the streaming path.

---

## 2. Bugs of the "wrong number / wrong claim" kind

### 2.1 The documented concurrency does not exist

CLAUDE.md and the code both claim bounded-concurrency batch saving ("`Semaphore` for bounded concurrency (6 concurrent tasks)"). In reality `save_card_batch` (`src/card/service.rs:113-173`) spawns a task and then **immediately awaits it** (`handle.await`, line 167) inside the closure that `parse_stream` awaits before continuing. Batches are therefore processed strictly sequentially; the `Semaphore`, `tokio::spawn`, and the `Arc<Mutex<…>>` set-existence cache are pure overhead. `cleanup_cards` (`service.rs:276-280`) likewise acquires a permit for inline sequential work.

**Recommendation:** decide which you want:
- *Sequential (simplest):* delete the semaphore/spawn/mutex machinery — behavior is unchanged and the code shrinks considerably; or
- *Actually concurrent:* have the closure push `JoinHandle`s into a `FuturesUnordered`/`JoinSet` bounded by the semaphore and await them after `parse_stream` completes (plus error collection).

Either way, update CLAUDE.md's "Key Design Patterns" to match reality.

### 2.2 Granular prices are parsed and then always thrown away in the MTGJSON paths

`rustc` itself flags it: `field granular is never read` (`src/price/domain/granular_price.rs:71`). Both `PriceEventProcessor` and `HistoricalPriceEventProcessor` painstakingly build `GranularPrice` rows for every card (`record_granular`), and `PriceService::save_prices` / `save_price_history_only` (`src/price/service.rs:272-329`) drop them. Since CK-direct is now the sole granular writer (ROADMAP 10.10 per comments), this is dead work on every daily ingest of a ~multi-hundred-MB file, plus dead code to maintain.

**Recommendation:** remove `CardPrices.granular`, `record_granular`, and `GRANULAR_PROVIDERS` usage from both MTGJSON processors (keep the CK path). If the historical granular backfill is still wanted someday, that's what git history is for.

### 2.3 Copy-paste log messages and misleading counts

- `CardService::delete_all` logs "Deleting all **prices**." (`src/card/service.rs:254`).
- `SetRepository`/`CardRepository` upserts use conditional `DO UPDATE … WHERE … IS DISTINCT FROM …`, so `rows_affected` excludes unchanged rows — but callers log it as "cards saved"/"sets ingested" (`src/set/service.rs:49-50`, controller totals). The numbers under-report and have confused more than one ETL postmortem in other projects. Rename the logs ("rows changed") or count inputs.
- `main.rs:74`: `eprint!` (no newline) for the fatal error path.

### 2.4 Portfolio queries disagree about unpriced cards, and services disagree about "today"

- `calculate_portfolio_summaries` uses `JOIN price` (`src/portfolio/repository.rs:119`) — a user's cards with no `price` row are excluded from `total_value` **and** from `total_cards`/`total_quantity`. `calculate_card_performance` uses `LEFT JOIN price` (`repository.rs:188`) and treats missing prices as 0. Same concept, two semantics; summary totals and per-card rows won't reconcile.
- "Today" is computed three ways: `chrono::Local::now()` (`src/portfolio/service.rs:29`), `chrono::Utc::now()` (`src/price/service.rs:161`, published-deck source), and `America/New_York` (`src/price/domain/price.rs:51`). Depending on container TZ, snapshots, CK rows, and MTGJSON rows can carry different dates around midnight.

**Recommendation:** make `LEFT JOIN` + `COALESCE(…, 0)` the single semantics, and add one `fn today() -> NaiveDate` helper (pick UTC or New_York deliberately) used everywhere.

### 2.5 Integration-test schema fixture has drifted from the code

`tests/fixtures/schema.sql` defines `portfolio_value_history(id, total_value, date)` — but `save_snapshots` (`src/portfolio/repository.rs:57-73`) inserts `user_id, total_value, total_cost, total_cards, date` with `ON CONFLICT (user_id, date)`. Any integration test touching that table would fail immediately; none exists, which is how the drift went unnoticed. `transaction`, `portfolio_summary`, `portfolio_card_performance`, `published_deck`, and `published_deck_card` are missing from the fixture entirely, so the portfolio and published-deck repositories have **zero** integration coverage — and they contain the most intricate SQL in the codebase.

**Recommendation:** sync the fixture with the web repo's migrations (ideally generate it from them) and add repository-level integration tests for portfolio and published-deck, following the existing `set_repository_test.rs` pattern.

### 2.6 `config.rs` oddities

`src/config.rs:18-33`: `DATABASE_URL` is checked twice (lines 19-21 make the `env::var("DATABASE_URL").or_else(…)` at line 22 unreachable for the Ok case); and when the URL is assembled from `DB_*` parts, the password is not percent-encoded — a password containing `@`, `/`, or `#` produces a broken URL. Drop the duplicate lookup and percent-encode user/password.

---

## 3. Architecture / hexagonal consistency

The README/CLAUDE.md describe a ports-and-adapters-ish layout (domain / mapper / repository / service), and the file layout follows it, but the dependency rules that make that architecture pay off are not enforced:

### 3.1 No ports (traits) — nothing is mockable

`CliController` holds concrete services; services hold concrete repositories, a concrete `Arc<ConnectionPool>`, and a concrete `Arc<HttpClient>`. The single trait in the codebase, `DecklistSource` (`src/published_deck/source.rs:13`), is also the only place a service can be tested with a fake — and not coincidentally `PublishedDeckService` has the best service-level unit test. Everywhere else, service logic (pipeline ordering, prune policies, batch orchestration) is untestable without a live Postgres + network.

**Recommendation:** you don't need traits for everything. Two ports buy most of the value:
1. a `CardDataSource`-style trait over `HttpClient` (streams + JSON fetches), and
2. per-module repository traits (or `#[cfg(test)]`-mockable structs).

Then service tests can drive `ingest_all` with a canned byte stream and an in-memory repo, which is exactly the coverage this codebase is missing (the current unit tests only cover pure functions).

### 3.2 Cross-module reach-through

- `CardService` takes a `SealedProductRepository` parameter and knows sealed batch sizes (`src/card/service.rs:182-197`) — the card module orchestrating another module's persistence.
- `CardService` holds `Arc<PriceService>` and performs price mutations inside `prune_duplicate_foils` (`service.rs:367-399`).
- `SealedProductService` constructs its own `SetRepository` (`src/sealed_product/service.rs:26`) rather than asking the set module's service.

**Recommendation:** move cross-domain orchestration up. The single-pass card+sealed ingest is inherently cross-module — put its orchestration in `ingest.rs` (which already owns the tee processor) or an application-layer service, with `CardService`/`SealedProductService` exposing narrow "save batch" operations. `prune_duplicate_foils` is really a *pricing-aware dedup* use case; it belongs in an application service that uses both modules' public APIs.

### 3.3 The controller is doing three jobs

`src/cli/controller.rs` (822 lines) mixes: command dispatch, interactive menu UI, and business orchestration/policy — including the magic number `min_price_pct = 0.36` (`controller.rs:751`), the CK-buylist "best-effort but fail the exit code" policy (`controller.rs:656-698`), and the full pipeline definition (`run_full_ingest_pipeline`). The interactive submenus duplicate knowledge of what the pipeline does in their label strings.

**Recommendation:** extract an `IngestPipeline` (application service) that owns ordering, the prune threshold constant, and the first-error-wins aggregation; leave the controller with dispatch + prompts + display. This also lets the pipeline be tested.

### 3.4 Leaky `ConnectionPool` abstraction

`src/database.rs` mixes safe `QueryBuilder` execution with raw-string entry points: `count(&str)`, `execute_raw(&str)`, and `row_exists` which `format!`s identifiers into SQL (`database.rs:59-63`). They're all called with constants today, so there's no injection *bug*, but the API invites one, and repositories inconsistently choose between `db.count(format!(…))` and query-builder equivalents.

**Recommendation:** keep `execute_raw` for the schema fixture only (gate it `#[cfg(test)]`-adjacent or document it), give `count` a table-enum or move per-table counts fully into repositories, and replace `row_exists`'s formatted identifiers with dedicated methods (`set_exists` is its only caller).

### 3.5 `main.rs` re-declares the whole module tree instead of using the library

`src/main.rs:10-21` declares `mod card; mod cli; …` in parallel with `src/lib.rs`. Consequences: the entire crate compiles **twice** (lib + bin), every unit test compiles and runs twice (118 tests × 2 in the test output), `cli` is unreachable from integration tests, and lib vs bin can silently diverge.

**Recommendation:** make `main.rs` a thin shim (`use scry::…`), move `cli` into `lib.rs`, delete the duplicate `mod` block. This roughly halves build and unit-test time by itself.

---

## 4. DRY violations

### 4.1 Four hand-rolled JSON state machines, two of them near-identical twins

- `PriceEventProcessor` vs `HistoricalPriceEventProcessor`: ~90 % identical (event dispatch, `at_price_value`, `record_granular`, path tracking). The only real difference is one accumulator vs a per-date map. Extract a shared path-tracking core, or parameterize one processor over "single date vs multi date".
- `CardEventProcessor` vs `SealedProductEventProcessor`: both re-implement "rebuild the current object as a JSON string, then `serde_json::from_str` it" — including duplicated, subtly divergent (see §1.8) escaping and comma logic across ~10 handler methods each.

**Recommendation:** extract one `SubtreeCollector` utility that, given "start collecting at this depth", accumulates events into a `serde_json::Value` (build the `Value` directly — `Map`/`Vec` pushes — instead of string concatenation + reparse). That removes the manual string escaping, the float re-serialization (`current_float()?.to_string()` can change number representation), and both copies of the comma logic. All four processors then become small routing shells, and the `CardSealedEventProcessor` tee stops depending on two independent depth counters staying in sync.

### 4.2 Duplicated retention SQL, ×3

The weekly/monthly tiered-retention CTE is copy-pasted for `price_history` (`src/price/repository.rs:214-242`), `set_price_history` (`src/set/repository.rs:229-256`), and `portfolio_value_history` (`src/portfolio/repository.rs:76-103`) — same intervals, same DOW/day-of-month rules. One helper taking a table name (from a fixed allow-list) removes six near-identical query blocks and guarantees the tiers can't drift apart.

### 4.3 Duplicated set-price upsert SQL

`SetRepository::update_prices` and `save_set_price_history` (`src/set/repository.rs:143-205`) differ only in table name and one conflict-target/date column. Same treatment.

### 4.4 Assorted repetition

- The `ON CONFLICT … WHERE col IS DISTINCT FROM EXCLUDED.col` change-detection lists in `save_cards` / `save_sets` / `save` repeat every column three times (insert list, SET list, WHERE list). A small macro or codegen helper would keep the three lists in lockstep; today adding a column requires touching three places per table and nothing fails if you miss one (the column silently stops updating).
- `calculate_set_prices` builds its `IN` list with a manual loop (`src/set/repository.rs:132-137`) while every sibling uses `= ANY(push_bind(vec))` — use `ANY` for consistency.
- `SetService::save_set_prices` (`src/set/service.rs:177-193`) chunks the same vec twice in two loops (current + history) and ignores the history save's count; one loop, both writes.
- Count return types alternate between `i64` and `u64` across repositories (`CardRepository::count -> u64`, `SetRepository::count -> i64`). Pick one (`i64`, since that's what Postgres returns).

---

## 5. Performance

- **§2.1** (no actual concurrency) and **§2.2** (dead granular parsing) are the two biggest wins.
- `prune_duplicate_foils` (`src/card/service.rs:336-409`) does per-card `save_cards(&[one])` and `delete_cards_batch(&[one id])` inside a loop over sets — N round trips where 2–3 batched statements per set would do. Also the `dup_foil_sets` list is a hard-coded policy living inside a service method; lift it to a documented constant like `BONUS_MAIN_SET_OVERRIDES`.
- `clean_up_prices` (`src/price/service.rs:217-235`) fetches all distinct dates then issues one `DELETE` per stale date. `DELETE FROM price WHERE date < (SELECT MAX(date) FROM price)` is one statement.
- `FbettegaSource::fetch_recent` (`src/published_deck/source.rs:182-213`) is fully sequential: days × feeds listing calls, then one GET per file. `futures::stream::iter(...).buffer_unordered(8)` over the file fetches would cut wall time substantially without hammering the API.
- `save_deck` (`src/published_deck/repository.rs:47-96`) does upsert + delete children + insert children as three non-transactional statements. Besides the atomicity issue (a crash strands a deck with no cards), it's 3 round trips per deck × hundreds of decks. Wrap in a transaction; optionally batch.

---

## 6. Reliability / transactionality

No repository operation uses a database transaction. The places where that is a correctness issue rather than a style point:

| Operation | Statements | Failure mode |
|---|---|---|
| `save_legalities` (`card/repository.rs:206`) | DELETE then INSERT | crash between → card loses all legalities |
| `delete_cards_batch` (`card/repository.rs:280`) | 4 DELETEs per chunk | partial delete leaves orphan-check to FKs |
| `published_deck::save_deck` | upsert + DELETE + INSERT | deck row with no cards |
| `reset_data` (controller) | 3 service calls | partially reset DB |

`delete_set_batch` gets it right with a single CTE — use that as the pattern, or add a `ConnectionPool::transaction` helper. Since these all re-run idempotently on the next ingest, this is medium severity, but `save_legalities` runs on every card batch of every ingest.

---

## 7. CLI / UX inconsistencies

- `ingest -c -k xyz`: `-k` is silently ignored (`src/cli/controller.rs:419` gates set-cards on `!cards`). Either make clap declare `conflicts_with` (as `buylist` already does) or log why it's skipped.
- `IngestCardsSealed` (`src/cli/commands.rs:48`) is documented as a "perf prototype" to compare against the two-pass flow — but the single-pass path is now the default inside `ingest`. The standalone command is vestigial; remove it or re-document it as a supported alias.
- The retention doc comment on `Retention {}` (`commands.rs:94-96`) mentions only `price_history`; the command actually also processes `set_price_history` and `portfolio_value_history` (and CLAUDE.md adds `granular_price_history`, which the code does **not** touch — see §8).
- Destructive-flow inconsistency: `reset_data` returns `Ok` when the user declines, so the rest of the pipeline continues after "Skipped data reset" — reasonable, but `handle_backfill` aborts entirely when truncate is declined. Pick one convention.

---

## 8. Documentation drift (CLAUDE.md / comments)

CLAUDE.md is the on-ramp for every future contributor (and for AI tooling); it's currently wrong about:

- **Modules:** `portfolio/`, `published_deck/`, `sealed_product/` are absent from the architecture tree; `price/domain` file list is missing `granular_price.rs`; `cardkingdom.rs`, `write_timings.rs`, `historical_event_processor.rs` unlisted.
- **Data source:** `http_client.rs` is described as a "Scryfall API client" — every URL in it is MTGJSON or Card Kingdom (`src/utils/http_client.rs:15-20`). The interactive help text (`controller.rs:291-293`) repeats the "from Scryfall" claim.
- **Concurrency:** "Semaphore for bounded concurrency (6 concurrent tasks)" — see §2.1.
- **Retention:** CLAUDE.md says the `retention` command covers `granular_price_history`; no code touches that table's retention. Either implement it (it will grow unboundedly from CK-direct daily writes!) or fix the doc. **This one may be an actual missing feature, not just a doc bug — worth checking what prunes `granular_price_history` in production.**
- **Commands list:** `ingest -b`, `ingest-decks`, `backfill`, `backfill-set-price-history`, `portfolio-summary` are missing from the Common Commands block.

---

## 9. Tooling, CI, Docker

- **CI has no `clippy` or `rustfmt` gate.** Clippy currently reports ~60 warnings (needless borrows, `clone()` on `Copy` types, missing `Default` impls for `HttpClient`/`FbettegaSource`, `or_insert_with(default)`, a large enum-variant size difference on `IngestRecord`). Add `cargo clippy --all-targets -- -D warnings` and `cargo fmt --check` jobs, fix the existing warnings once.
- **Dockerfile:** `development` stage copies `Cargo.toml` but not `Cargo.lock` (non-reproducible dev builds — the build stage gets it right); `production` runs as **root** on unpinned `alpine:latest` — add a `USER` and pin the base (e.g. `alpine:3.20`).
- Neither Docker stage caches dependencies separately from `src` — every source change recompiles all dependencies. The usual "copy manifests, build a dummy `main.rs`, then copy `src`" (or `cargo-chef`) layering would cut CI image builds dramatically.

---

## 10. Minor nits (roll into a cleanup PR)

| Location | Issue |
|---|---|
| `src/set/repository.rs:5` | `use anyhow::{Ok, Result}` shadows `std::result::Result::Ok` — a well-known source of confusing type errors; import only `Result`. |
| `src/card/service.rs:64` | `fetch_set_cards(&set_code)` passes `&&str`. |
| `src/card/service.rs:75` | `let _ = …await?;` — the `let _ =` is redundant with `?`. |
| `src/price/service.rs:224` | `max_date.clone()` on a `Copy` type; `.map(\|d\| *d)` at `service.rs:240` is `.copied()`. |
| `src/price/domain/price.rs:10` | `Price.id` is always `None` and never read — dead field. |
| `src/health_check/service.rs:55` | `FROM set` unquoted; every other query quotes `"set"`. (Parses fine — `set` is non-reserved — but be consistent.) |
| `src/utils/json_stream_parser.rs:49` | `io::Error::new(ErrorKind::Other, e)` → `io::Error::other(e)`. |
| `src/published_deck/source.rs:139` | `&d[..d.len().min(10)]` byte-slices a string — panics on a multi-byte char at the boundary; use `d.get(..10)` or `chars().take(10)`. |
| `src/ingest.rs:20` | `IngestRecord::Card(Card)` is much larger than `Sealed` (clippy: large variant); `Box<Card>` if it matters. |
| `main.rs:33-35, 77-79` | Banner logged before `dotenvy`/config; "Scry - MTG Data Management Tool" logged twice in different words. Cosmetic. |
| `tests/common/mod.rs:52` | `create_test_card` dead in one test binary — move helpers behind `#[allow(dead_code)]` or split per-suite. |

---

## Prioritized action plan

1. **(Bug)** Persist foreignness and make `prune_foreign_unpriced` DB-driven (§1.1).
2. **(Bug)** Fix delete/reset FK coverage; remove fake `CASCADE`; single CTE or TRUNCATE for reset (§1.2–1.3).
3. **(Bug)** Harden `JsonStreamParser` against stream failures; abort on parser errors (§1.4).
4. **(Bug)** Non-TTY-safe confirmations + `--yes` flag (§1.5).
5. **(Feature-or-doc bug)** Decide who prunes `granular_price_history` (§8).
6. **(Simplify)** Delete the no-op concurrency machinery *or* make it actually concurrent; delete dead granular parsing (§2.1–2.2). Big code shrink, measurable ingest speedup.
7. **(Structure)** Thin `main.rs` to use the lib crate (§3.5) — halves compile/test time.
8. **(Structure)** Extract `IngestPipeline` from the controller; move cross-module orchestration out of `CardService` (§3.2–3.3).
9. **(DRY)** Shared subtree-collector for the four event processors (§4.1); shared retention/upsert helpers (§4.2–4.3).
10. **(Testing)** Sync `tests/fixtures/schema.sql` with the web migrations; add portfolio/published-deck integration tests; add ports/traits so services get unit tests (§2.5, §3.1).
11. **(Hygiene)** Clippy+fmt in CI, fix current warnings, Docker hardening, CLAUDE.md refresh (§8–9).

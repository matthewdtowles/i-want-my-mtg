# Phase 6 (Buylist Pricing) — Implementation Handoff

Status snapshot for resuming work. Companion to the decision doc
`docs/6.1-buylist-price-data-spike.html`. Epic #498.

Phase 6 surfaces **buylist** (sell-to-vendor) prices next to retail, highlights
the best offer per card, and (later) helps users decide who to sell to in bulk.
Recommendation adopted by the 6.1 spike: **Tier A + Tier B** (both free).

The work spans two repos that share one Postgres DB:
- **web** (`i-want-my-mtg`, this repo)
- **scry** (`/Users/matthewtowles/Projects/scry`, Rust ETL)

6.2/6.3 (granular store + card-page display, Tier A) are merged and live.
6.4 (inventory market sell value + CSV export) is **merged** (web PR #524).
6.7 (Tier B, CK-direct) is **merged** (web PR #522 + the scry branch) — scope on issue #513.
6.8 (normalize card image; drop `img_src`) is **merged** — see Done below.

**Single-source is final.** 6.6 (condition vocab, #512) and 6.9 Tier C (broader vendor
coverage, #515) are **closed/skipped**: buylist is upstream single-vendor (Card Kingdom)
and every row is `NM`, so there is nothing to normalize across grades or compare across
vendors. Revisit only if a multi-grade / multi-vendor source ever lands.

**Framing decision (2026-06-11):** user-facing copy for the sell features uses vendor-neutral
**"market sell value"** terminology — no named-vendor pitch (we are not partnered with Card
Kingdom). CK remains the data source internally; it is not the brand of the feature. The 6.9
research (#515) confirmed no free, legitimate multi-vendor buylist API exists, so 6.4 proceeds
single-source and 6.5 is re-scoped to the cash-vs-credit decision (multi-vendor optimizer gated
on 6.9).

---

## Done

> **Revision (during build — supersedes the single-table descriptions below).** The
> store was split to mirror `price` / `price_history`: **`granular_price`** is the
> current per-vendor offer (PK *without* `date`, one row per series — the card page
> reads it directly), and **`granular_price_history`** is the dated, retention-bounded
> series. The **`qty` column was dropped** (buy quantity is inconsistent across
> vendors; deferred to Tier B and modelled then). Current writes carry a freshness
> guard (`ON CONFLICT … WHERE EXCLUDED.date >= granular_price.date`) so a stale ingest
> can't regress a series. Daily ingest writes **both** tables; backfill writes
> **history only**; retention runs on `granular_price_history`. The web read
> (`findCurrentBuylistByCardId`) is now a direct one-row-per-series read (no
> date-sort / JS dedup).

### Web — 6.2 granular store + 6.3 card-page display (branch `spike/6.1-buylist-price-data`)
- **6.2** (`5fb8e4d`): `granular_price` table — migration `034` + init schema.
  Composite natural-key PK `(card_id, provider, price_type, finish, condition, date)`,
  FK to `card` cascade, `condition NOT NULL DEFAULT 'NM'`. `GranularPriceOrmEntity`
  (composite `@PrimaryColumn`, no card relation — FK enforced in SQL). Registered in
  `DatabaseModule`.
- **6.3** (`2a8d4c6`): read path + card-page UI. `GranularPrice` domain entity,
  `GranularPriceRepositoryPort` + repo (`findCurrentBuylistByCardId` = latest row per
  provider/finish/condition, JS dedup), mapper. `vendorDisplayName` constant in
  `src/core/pricing/vendor.ts` (Card Kingdom, Cardsphere + sell-to flag).
  `CardService.findCurrentBuylist`; `CardOrchestrator` fetches it (graceful on error);
  `CardPresenter.toBuylistView` (group by finish, NM only, mark best). Buylist block in
  `card.hbs`; `tailwind.css` regenerated for the emerald "best" highlight.
  Verified by integration e2e in `test/integration/public.e2e-spec.ts` + seed rows.

### scry — scry#14 Tier A + retention (branch `feat/scry-14-granular-tier-a`, 3 commits)
Key insight: the derived averaged `price` is **already computed in-Rust at ingest**, so
all of this is *additive* — `price`/`price_history` come out byte-identical.

- **Tier A, today's ingest** (`cdd8f93`): `ingest_all_today` emits `granular_price` rows for
  retail AND buylist, plus the unchanged retail-only average. New `GranularPrice` +
  `CardPrices` bundle domain (`src/price/domain/granular_price.rs`); processor emits the
  bundle; `service.save_prices` splits it; `repository.save_granular_prices` batch-upserts
  (price = last-writer-wins, qty preserved via `COALESCE`). `granular_price` added to
  `tests/fixtures/schema.sql`.
- **Historical backfill + provider expansion** (`d2a1736`): `HistoricalPriceEventProcessor`
  emits `CardPrices` bundles (per-date `price_history` averages unchanged + per-date granular
  rows), so `ingest_all_historical` backfills 90 days of granular at once. `CardPrices.average`
  → `averages: Vec`. Provider lists split in `src/price.rs`: `AVERAGE_PROVIDERS` = original 3
  (keeps `price` identical) vs `GRANULAR_PROVIDERS` = +`manapool`. **Cardmarket excluded** (EUR;
  product is USD-only). Repository `save`/`save_granular_prices` now **chunk** inserts (8000/4000
  rows) to stay under Postgres's 65535 bind-param limit.
- **Retention** (`969f945`): `granular_price` joins the daily→weekly→monthly retention pass
  (refactored price_history retention into table-parameterized helpers; granular variants;
  `RetentionResult` + controller logging include granular counts).

Tests across the scry branch: **106 unit + 7 price integration tests (real PG18) green; no warnings.**

---

## Locked decisions
- **Current / history split** mirrors `price` / `price_history`: `granular_price` (current,
  no `date` in the key, one row per series — the hot card-page read) + `granular_price_history`
  (dated, retention-bounded). Daily ingest writes both; backfill writes history only; the
  current write is guarded (`WHERE EXCLUDED.date >= granular_price.date`) so it never regresses.
- **No `qty` column** until Tier B — buy quantity is inconsistent across vendors (buy limits,
  tiered/per-condition pricing), so it's modelled when CK-direct actually delivers it.
- **Derivation lives in scry (Rust), not a DB function.** Granular rows + the derived averaged
  `price` are written in the same ingest pass. (`update_set_prices()` is a DB function only
  because it aggregates across cards; per-card averaging is in-memory.)
- **`condition = 'NM'`** by convention for sources with no grade. Resolves the NULL-in-key
  problem (composite PK can't hold NULLs). Grade vocabulary deferred to ROADMAP **6.6**.
- **USD prices only** — exclude Cardmarket (EUR). USD providers: `tcgplayer`, `cardkingdom`,
  `cardsphere`, `manapool`. `granular_price` has no currency column.
- **Vendor metadata is a code constant** until the 6.5 optimizer needs a DB `vendor` table.

---

## ~~Open decision~~ RESOLVED (6.7) — Tier B card matching

Tier B = ingest the **Card Kingdom direct pricelist** for live buylist `qty` + condition.
The CK feed is confirmed (fetched live): `https://api.cardkingdom.com/api/v2/pricelist`,
no auth, **~147k products, ~62MB** (must stream, not bulk-load). Per-product shape:

```json
{ "id": 10000, "sku": "4ED-117", "scryfall_id": "a363bc91-…",
  "name": "Abomination", "edition": "4th Edition", "is_foil": "false",
  "price_retail": "0.49", "qty_retail": 9,
  "price_buy": "0.05", "qty_buying": 16,
  "condition_values": { "nm_price": "0.49", "nm_qty": 2, "ex_price": "0.39", … } }
```

Buylist data we want: `price_buy` + `qty_buying` (+ `is_foil` → finish; condition NM).

**The problem:** CK identifies cards by `scryfall_id`; our cards are keyed by **MTGJSON uuid**
and have **no `scryfall_id` column**. So CK rows can't be matched to our cards directly. (Tier A
needed no matching because MTGJSON prices share the MTGJSON uuid.)

**Decision (implemented in web migration `036` — note: NOT 035, which the granular-PK
hotfix took): `scryfall_id` is a unique indexed column — NOT the primary key.** Reasoning:
- Keep `card.id` = MTGJSON uuid as PK: it's what user data (`inventory`, `transaction`), all
  prices, every FK, and the public API already reference. Re-keying = huge, risky migration over
  user data, and would *invert* the matching problem onto MTGJSON (our high-volume daily source).
  We need both ids regardless of which is PK.
- A column captures all of scryfall_id's interop utility (CK, Scryfall API, third-party tools)
  with near-zero risk.
- **Backfill is free/immediate:** `card.img_src` already embeds the scryfall_id
  (`{a}/{b}/{scryfall_id}.jpg`, built by `Card::build_scryfall_image_path`), so scry can populate
  the new column from existing data without a full card re-ingest.

Alternative considered: recover scryfall_id from `img_src` at runtime (no column at all) — works,
but the column is the cleaner long-term home and the user leaned toward scryfall_id's broader utility.
Rejected: making scryfall_id the PK (blast radius over user data + API; inverts the MTGJSON path).

---

## Tier B — BUILT (6.7, 2026-06-10)

As-built (full scope + decision log on issue #513):
1. **Web** (branch `feat/6.7-scryfall-id-granular-qty`): migration `036` — `card.scryfall_id`
   (varchar, nullable, **unique index**, SQL backfill from `img_src` shape-guarded to
   `{a}/{b}/{uuid}.jpg`; verified 1:1 across all 91,316 cards) + nullable `qty integer` on both
   granular tables; init-schema parity; ORM entity columns only (no read-path changes);
   integration spec `test/integration/migration-036.e2e-spec.ts` (9 tests).
2. **scry** (branch `feat/scry-14-tier-b-ck-direct`):
   - `Card.scryfall_id` persisted on ingest (Option<String>; mapper already required it).
   - `src/price/cardkingdom.rs`: streaming `CkPricelistEventProcessor` (actson, same harness as
     MTGJSON) + `granular_from_ck_products` policy fn. **Only real offers emit**:
     `price_buy > 0 AND qty_buying > 0` — MTGJSON's buylist already encodes "CK is buying" by
     row presence, so qty-0 products are skipped, not stored. `qty` carried on real offers
     (kept for 6.4 quantity caps — user decision).
   - **Per-series dedupe keeping the best offer** — real-feed finding: etched products report
     `is_foil=true` and can share a `scryfall_id` with the regular foil, collapsing two CK
     products onto one `(card, finish)` series; duplicate keys in one multi-row upsert are a
     Postgres error ("cannot affect row a second time").
   - `qty = EXCLUDED.qty` (last-writer-wins, NOT COALESCE): MTGJSON writes qty NULL, CK-direct
     overwrites with live qty in the same run; if CK fails, qty reads NULL ("unknown") rather
     than stale.
   - Wired into `update_prices` AFTER the MTGJSON ingest (CK-direct overwrites the indicative
     CK row); **best-effort** — failure is logged, never blocks the averaged price refresh,
     surfaces via non-zero exit (same policy as the 5.12.1 hardening).
3. **Deploy order**: publish scry first (inert), then deploy web — migration 036 runs before
   `setup-cron.sh` extracts the new binary. One web deploy lands everything.
4. **Buylist links deferred to 6.4** (user decision): sell tiles get clickable vendor
   buylist-search URLs (built from card name) with the inventory sell workflow. **Plain links,
   no `?partner=` attribution** — we are not partnered with CK and don't present the feature
   as a named-vendor pitch (see framing decision above).

## Remaining work

### 6.8 — normalize the card image; drop `img_src` ✅ (DONE)
Shipped as a coupled web+scry deploy sequence so the column drop never preceded the
no-`img_src` binary:
- **6.8a** (web #525): web derives the image tail from `card.scryfall_id` via
  `buildScryfallImagePath` (`src/shared/utils/scryfall-image.util.ts`, TS mirror of scry's
  `Card::build_scryfall_image_path`), wired into `card.mapper` + `transaction.repository`. No
  visual change. The **`imgSrc` field stays** in JSON API DTOs / MCP / HBS — derived, not a column.
- **6.8b step 1** (web #526, migration `037`): `img_src` made nullable.
- **6.8b step 2** (scry #18, released 5.13.1): scry persists `scryfall_id` only; stops writing
  `img_src` (dropped from the card upsert + `Card` domain + `tests/fixtures/schema.sql`).
- **6.8b step 3** (web, migration `038`): drop the `card.img_src` column. Migrations `036`/`037`
  guarded with column-existence `DO` blocks because `run_migrations.sh` replays every `*.sql`
  on every deploy (untracked); `001_complete_schema.sql` dropped the column. The migration runs
  before `setup-cron.sh` extracts `scry:latest`, so column + still-writing binary never coexist.
- **json-ld:** the roadmap bullet was stale — the HBS `imgSrc` is already a full URL
  (`card.presenter.buildImgSrc`), so `schema.image` was already absolute. No change.

### Closed / skipped (single source)
- **6.6 condition vocab (#512):** every row is `NM`; no multi-grade source. Closed.
- **6.9 Tier C (#515):** no free/legitimate multi-vendor buylist API exists; proceeding
  single-source is final. The only cleanup — dropping the dead `cardsphere` provider — shipped in
  scry PR #19 (it lived in `AVERAGE_PROVIDERS`, *not* `GRANULAR_PROVIDERS` as the roadmap said;
  output-identical since cardsphere is absent upstream). go-mtgban / paid aggregator stay gated.

### Later
- ~~6.3 remainder: buylist on the **set page + binder overlay**~~ **Descoped in 6.3.1** — buylist
  lives only on the card page; the set-list "sell $X" rows and binder "Buylist $X" overlay were
  removed (clutter + mobile overflow). The batched `findCurrentBuylistByCardIds` read is kept for 6.4.
- ~~6.4 inventory **market sell value**~~ **Shipped (PR #524).** Best offer per item, qty-capped
  payout totals, group-by-vendor kept as structure, plain buylist links, CSV export.
- ~~6.5 cash-vs-credit optimizer~~ **Shipped (PR #528 buy-list, #529 optimizer).** Per-user `buy_list` (migration
  `039`) + `/buy-list` page; pure `cash-vs-credit.policy.ts`; `/optimizer` page with editable
  bonus-% and `GET /optimizer/export.csv`. No DB `vendor` table was needed — the bonus default
  stays the `cardkingdom` code constant. Multi-vendor consolidation stays gated on 6.9
  (closed single-source). MCP mirror is the only open follow-up (iwantmymtg-mcp#9).
- Possible: currency column → then Cardmarket (only if non-USD is ever wanted; currently out).
- ~~ROADMAP 6.6: condition grade vocabulary~~ **Closed (#512)** — single grade (`NM`) only.

---

## Quick reference
- Web branch `spike/6.1-buylist-price-data` — `2a8d4c6` + the 6.2 current/history-split + qty-drop revision.
- scry branch `feat/scry-14-granular-tier-a` — tip `4e4e8d8`.
- scry test DB: integration tests are `#[ignore]`; run with a throwaway PG18 and
  `TEST_DATABASE_URL`, e.g. `cargo test --test price_repository_test -- --ignored`.
- Issues: epic #498; sub-issues #500 (6.2), #501 (6.3); cross-repo scry#14.

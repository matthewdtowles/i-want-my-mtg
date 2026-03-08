# Transaction Tracking & Portfolio Value History — Implementation Plan

This document tracks the implementation of transaction-based P&L tracking and
portfolio value history. Work spans multiple PRs and sessions.

Last updated: 2026-03-07

---

## Design Decisions

### Transactions sync inventory (hybrid model)
Inventory remains a simple quantity tracker (`card_id, user_id, foil, quantity`).
Transactions are an opt-in financial ledger that **sync with inventory** when used:

- **BUY transaction** auto-increments inventory quantity for that card/foil combo
- **SELL transaction** auto-decrements inventory quantity
- **Deleting a transaction** reverses the inventory change (BUY delete decrements,
  SELL delete increments)
- **Direct inventory changes** (without a transaction) still work for casual
  tracking — inventory can exist without transactions
- Inventory quantity is always >= transaction-derived quantity

This hybrid approach means transactions and inventory stay consistent when both
are used, but users who don't care about P&L can still manage inventory directly.

### Inventory sync prompt (backfill untracked inventory)
When a user has more inventory than transaction-derived quantity for a card, the
card detail page shows a sync prompt: *"N untracked — Record as buy?"* with the
current market price pre-filled and today's date. This gives users an easy path
to backfill transaction history for cards added before they started tracking
transactions. The prompt is non-blocking — users can dismiss it.

### FIFO cost basis via lot matching
Each BUY transaction is a "lot" with a remaining quantity. When a user records a
SELL, lots are consumed oldest-first (FIFO). Average cost basis can be derived
from the same data when needed (`SUM(remaining * price) / SUM(remaining)`).

### Foil and non-foil have separate cost bases
Transactions include an `is_foil` flag. Cost basis is computed independently
for foil and non-foil holdings of the same card.

### Portfolio value history via Scry ETL
Daily portfolio value snapshots are computed during post-ingest-updates (after
prices are refreshed). Same retention policy as price_history and
set_price_history: daily for 7 days, weekly (Mondays) for 7-28 days, monthly
(1st) beyond 28 days.

---

## Transaction Entity

```
transaction {
    id              serial PRIMARY KEY
    user_id         int NOT NULL -> users(id) ON DELETE CASCADE
    card_id         varchar NOT NULL -> card(id) ON DELETE CASCADE
    type            varchar NOT NULL  -- 'BUY' or 'SELL'
    quantity        int NOT NULL      -- always positive
    price_per_unit  numeric(10,2) NOT NULL
    is_foil         boolean NOT NULL
    date            date NOT NULL DEFAULT CURRENT_DATE
    source          varchar           -- e.g. 'tcgplayer', 'lgs', 'trade'
    fees            numeric(10,2)     -- shipping, platform fees, etc.
    notes           text
    created_at      timestamptz NOT NULL DEFAULT NOW()
}

UNIQUE INDEX: (user_id, card_id, is_foil, type, date, price_per_unit)
  -- prevents exact duplicate entries
INDEX: (user_id, card_id, is_foil, date)
  -- for FIFO lot matching queries
INDEX: (user_id, date)
  -- for portfolio-level queries
```

### FIFO Lot Matching

For SELL transactions, the service layer walks BUY lots oldest-first:

```
Given: user sells 3x of card X (non-foil)

BUY lots (ordered by date ASC):
  Lot A: bought 2 @ $5.00 on 2025-01-01
  Lot B: bought 4 @ $8.00 on 2025-03-15

FIFO consumption:
  Consume 2 from Lot A -> realized gain = 2 * (sell_price - $5.00)
  Consume 1 from Lot B -> realized gain = 1 * (sell_price - $8.00)

Remaining: Lot B has 3 left @ $8.00
```

Lot remaining quantities are **not stored** — they are derived at query time by
subtracting SELL quantities from BUY quantities in date order. This keeps the
schema simple and avoids denormalization drift.

---

## Portfolio Value History Entity

```
portfolio_value_history {
    id              serial PRIMARY KEY
    user_id         int NOT NULL -> users(id) ON DELETE CASCADE
    total_value     numeric(12,2) NOT NULL  -- SUM(qty * market_price) all cards
    total_cost      numeric(12,2)           -- SUM(qty * avg_cost) from transactions (null if no transactions)
    total_cards     int NOT NULL
    date            date NOT NULL
}

UNIQUE: (user_id, date)
```

Computed during Scry `post-ingest-updates` after price refresh. `total_cost`
is populated only for users who have transaction data.

---

## Phases & Tasks

### Phase 1 — Transaction Foundation (Database + Backend)

- [x] 1.1 Create migration `018_table_transaction.sql`
- [x] 1.2 Add `transaction` to initial schema file for fresh installs
- [x] 1.3 Create Transaction domain entity (`src/core/transaction/transaction.entity.ts`)
- [x] 1.4 Create Transaction ORM entity (`src/database/transaction/transaction.orm-entity.ts`)
- [x] 1.5 Create Transaction mapper (`src/database/transaction/transaction.mapper.ts`)
- [x] 1.6 Create TransactionRepositoryPort (`src/core/transaction/transaction.repository.port.ts`)
- [x] 1.7 Create TransactionRepository (`src/database/transaction/transaction.repository.ts`)
- [x] 1.8 Create TransactionService with CRUD + FIFO lot matching (`src/core/transaction/transaction.service.ts`)
- [x] 1.9 Create TransactionModule (`src/core/transaction/transaction.module.ts`)
- [x] 1.10 Register ORM entity and repository port binding in DatabaseModule
- [x] 1.11 Register TransactionModule in CoreModule
- [x] 1.12 Write unit tests for TransactionService (CRUD, FIFO logic, validation)
- [x] 1.13 Write unit tests for TransactionRepository (via mocked port in service tests)

**PR boundary: Phase 1 can ship as a single PR.**

---

### Phase 2 — Transaction UI

- [x] 2.1 Create TransactionController (`src/http/transaction/transaction.controller.ts`)
- [x] 2.2 Create TransactionOrchestrator (`src/http/transaction/transaction.orchestrator.ts`)
- [x] 2.3 Create request/response DTOs (`src/http/transaction/dto/`)
- [x] 2.4 Create TransactionPresenter (`src/http/transaction/transaction.presenter.ts`)
- [x] 2.5 Create HttpTransactionModule and register in HttpModule
- [x] 2.6 Create transaction list view (`views/transactions.hbs`) — user's full transaction history
- [x] 2.7 Add "Record Transaction" form to card detail page (buy/sell, qty, price pre-filled with market price, date defaulted to today)
- [x] 2.8 Add transaction summary to card detail page (cost basis, realized gains, unrealized gain)
- [x] 2.9 Add transaction prompt to inventory update flow (non-blocking "Record a buy/sell?" after +/- quantity)
- [x] 2.10 Add card-level P&L display: cost basis, current value, gain/loss, ROI %
- [x] 2.11 Write unit tests for orchestrator and presenter

**PR boundary: Phase 2 may split into 2 PRs (2.1-2.6 core UI, then 2.7-2.11 integration).**

---

### Phase 2.5 — Bug Fixes, Transaction Editing, Inventory Sync

#### Bug fixes

- [x] 2.12 Fix card link in transactions view — use `card.number` (collector number) instead of `cardId` in URL (`/card/:setCode/:number`)
- [x] 2.13 Fix presenter `buildCardMap` to include `number` field so it's available for URL construction

#### Transaction editing

- [x] 2.14 Add `update` method to TransactionService (validate ownership, re-check SELL constraints)
- [x] 2.15 Add `update` method to TransactionRepositoryPort and TransactionRepository
- [x] 2.16 Add `PUT /transactions/:id` endpoint to TransactionController
- [x] 2.17 Add inline edit UI to transactions page (editable quantity, price per unit, date, source, notes)
- [x] 2.18 Write unit tests for transaction update (service + orchestrator)

#### Inventory sync on transaction create/delete

- [x] 2.19 Inject InventoryService into TransactionService (or create a TransactionInventorySyncService)
- [x] 2.20 On BUY create: auto-increment inventory quantity
- [x] 2.21 On SELL create: auto-decrement inventory quantity
- [x] 2.22 On BUY delete: auto-decrement inventory quantity
- [x] 2.23 On SELL delete: auto-increment inventory quantity
- [x] 2.24 On transaction update: adjust inventory delta (old qty vs new qty)
- [x] 2.25 Write unit tests for inventory sync logic

#### Untracked inventory sync prompt

- [x] 2.26 Add logic to card detail orchestrator to compute untracked quantity (inventory qty minus transaction-derived qty)
- [x] 2.27 Show sync prompt on card detail page when untracked > 0: "N untracked — Record as buy?" with market price pre-filled
- [x] 2.28 Handle sync form submission — creates BUY transaction(s) without double-incrementing inventory (since those items are already in inventory)
- [x] 2.29 Write unit tests for untracked quantity calculation and sync flow

**PR boundary: Phase 2.5 ships as one or two PRs (bug fixes + editing, then inventory sync).**

---

### Phase 3 — Portfolio Value History (Scry ETL + Backend + Chart)

#### 3A — Database & NestJS read layer

- [x] 3.1 Create migration `019_table_portfolio_value_history.sql`
- [x] 3.2 Add `portfolio_value_history` to initial schema file
- [x] 3.3 Create PortfolioValueHistory domain entity (`src/core/portfolio/`)
- [x] 3.4 Create ORM entity, mapper, repository port, repository
- [x] 3.5 Create PortfolioService with read methods (get history for user, date range)
- [x] 3.6 Create PortfolioModule, register in CoreModule and DatabaseModule

#### 3B — Scry ETL snapshot step

- [x] 3.7 Add `portfolio` module to Scry (`scry/src/portfolio/`)
- [x] 3.8 Implement `calculate_portfolio_values()` — query all users' inventory value
- [x] 3.9 Implement `save_portfolio_value_history()` — UPSERT snapshots with COALESCE
- [x] 3.10 Add portfolio snapshot step to `post_ingest_updates()` in `cli/controller.rs`
- [x] 3.11 Implement retention for `portfolio_value_history` (same tiers as price_history)
- [x] 3.12 Add retention call to existing `retention` command handler
- [x] 3.13 Write Rust tests for portfolio snapshot and retention

#### 3C — Chart UI

- [x] 3.14 Create PortfolioController and PortfolioOrchestrator in HttpModule
- [x] 3.15 Create portfolio value chart view (line chart: value over time)
- [x] 3.16 Add chart to inventory page or as a dedicated /portfolio route
- [x] 3.17 Add cost basis line to chart (for users with transaction data)

**PR boundary: 3A+3B as one PR, 3C as a follow-up.**

---

### Phase 4 — P&L Analytics Dashboard

#### Design Decisions

##### Snapshot-first architecture (performance)
Portfolio analytics are read from pre-computed snapshots, not calculated on every
page load. Two snapshot producers exist:

1. **Scry ETL** (`cargo run -- portfolio-summary`) — bulk-computes summaries for
   all users. Designed to run as a cron job after ingestion but **not coupled to
   the ingest command**. Can run independently on its own schedule.
2. **NestJS on-demand refresh** — single-user computation triggered by the user
   via a "Refresh" button. Rate-limited to prevent abuse:
   - Max **3 refreshes per day** per user
   - Minimum **1 hour** between refreshes
   - Rate limits configured via environment variables (`PORTFOLIO_REFRESH_MAX_DAILY`,
     `PORTFOLIO_REFRESH_COOLDOWN_MINUTES`) per 12-factor principles

Both producers write to the same `portfolio_summary` table using UPSERT semantics.
The NestJS read path always reads from the snapshot — never computes on the fly.

##### Snapshot table: `portfolio_summary`
Stores the latest computed summary per user. Separate from `portfolio_value_history`
(which stores daily time-series data). One row per user, overwritten on each refresh.

```
portfolio_summary {
    user_id             int PRIMARY KEY -> users(id) ON DELETE CASCADE
    total_value         numeric(12,2) NOT NULL  -- current market value of holdings
    total_cost          numeric(12,2)           -- total cost basis (null if no transactions)
    total_realized_gain numeric(12,2)           -- sum of realized gains from all sells
    total_cards         int NOT NULL             -- unique cards held
    total_quantity      int NOT NULL             -- total units held
    computed_at         timestamptz NOT NULL DEFAULT NOW()
    refreshes_today     int NOT NULL DEFAULT 0
    last_refresh_date   date NOT NULL DEFAULT CURRENT_DATE
}
```

`refreshes_today` and `last_refresh_date` track rate limiting. When
`last_refresh_date < CURRENT_DATE`, reset `refreshes_today` to 0.

##### Realized gains by year (deferred)
**Status: deferred.** The current implementation computes all-time realized gains
only. Year-based filtering is a future enhancement.

Design (for when implemented): Sells are filtered by calendar year to show annual
realized gains. The FIFO cost basis for each sell is determined by matching
against buy lots at query time (lot order is stable regardless of year filter).
The year list is derived from the user's actual sell dates — no empty years shown.

Scoped data when a year is selected:
- **Realized gains**: filtered to sells in that year
- **Total invested / current value / unrealized**: always all-time (reflect current holdings)

##### Card performance data
Per-card P&L data (for top/worst performers and set-level aggregation) is computed
as part of the snapshot. Stored in a separate table to avoid unbounded JSON in the
summary row:

```
portfolio_card_performance {
    id                  serial PRIMARY KEY
    user_id             int NOT NULL -> users(id) ON DELETE CASCADE
    card_id             varchar NOT NULL -> card(id) ON DELETE CASCADE
    is_foil             boolean NOT NULL
    quantity            int NOT NULL
    total_cost          numeric(10,2) NOT NULL
    average_cost        numeric(10,2) NOT NULL
    current_value       numeric(10,2) NOT NULL
    unrealized_gain     numeric(10,2) NOT NULL
    realized_gain       numeric(10,2) NOT NULL
    roi_percent         numeric(8,2)             -- NULL if total_cost = 0
    computed_at         timestamptz NOT NULL DEFAULT NOW()

    UNIQUE (user_id, card_id, is_foil)
}

INDEX: (user_id, unrealized_gain + realized_gain DESC)  -- for top performers
INDEX: (user_id, unrealized_gain + realized_gain ASC)   -- for worst performers
```

Rows are replaced in full on each snapshot computation (DELETE + INSERT for user,
or UPSERT per card). This table is the source for tasks 4.2, 4.3, and 4.4.

##### Realized gains by year storage (deferred)
When year filtering is implemented, annual realized gains will be derived at
query time by filtering sells by date in the FIFO computation. This avoids
storing year-level breakdowns in the snapshot since the transaction ledger is the
source of truth and sell counts are bounded.

##### DRY and 12-factor principles
- **Single computation path**: one `PortfolioSummaryCalculator` (or equivalent)
  in NestJS computes the summary. Both the on-demand refresh endpoint and the ETL
  call the same logic (ETL via direct SQL mirroring the same algorithm).
- **Config via env vars**: rate limits, refresh cooldowns, feature flags.
- **Stateless web process**: no in-memory caching of summaries. Always read from DB.
- **Backing service parity**: same PostgreSQL table written by ETL and web app.
- **Separation of concerns**: computation in services, presentation in orchestrators/
  presenters, storage in repositories.

---

#### 4A — Snapshot Infrastructure

- [x] 4.1 Create migration for `portfolio_summary` and `portfolio_card_performance` tables
- [x] 4.2 Add tables to initial schema (`001_complete_schema.sql`)
- [x] 4.3 Create domain entities for PortfolioSummary and PortfolioCardPerformance (`src/core/portfolio/`)
- [x] 4.4 Create ORM entities, mappers, repository ports, and repositories (`src/database/portfolio/`)
- [x] 4.5 Register new ORM entities and repository port bindings in DatabaseModule
- [x] 4.6 Create `PortfolioSummaryService` with:
  - `computeSummary(userId)` — calculates portfolio summary + per-card performance from transactions, inventory, and current prices
  - `getSummary(userId)` — reads latest snapshot from DB
  - `getCardPerformance(userId, sortBy, limit)` — reads top/worst performers
  - `refreshSummary(userId)` — rate-limited on-demand computation (checks `refreshes_today` and cooldown)
- [x] 4.7 Add rate-limit config env vars (`PORTFOLIO_REFRESH_MAX_DAILY`, `PORTFOLIO_REFRESH_COOLDOWN_MINUTES`) to `.env.example`
- [x] 4.8 Write unit tests for PortfolioSummaryService (computation, rate limiting, edge cases)

**PR boundary: 4A ships as one PR (infrastructure, no UI changes).**

---

#### 4B — Portfolio Dashboard UI

- [x] 4.9 Expand `PortfolioOrchestrator.getPortfolioView` to include summary data and card performance
- [x] 4.10 Expand `PortfolioViewDto` with summary fields and performer lists
- [x] 4.11 Create `PortfolioPresenter` for formatting summary values (reuse gain/ROI formatting patterns from `TransactionPresenter`)
- [x] 4.12 Add summary cards section to `portfolio.hbs` above the chart:
  - Current Value, Total Invested, Total Gain/Loss (color-coded), ROI %
  - Realized Gains (all-time; year filtering deferred)
  - Total Cards, Total Units
  - "Last updated" timestamp + "Refresh" button (disabled when on cooldown, shows remaining refreshes)
- [x] 4.13 Add top performers section (top 5-10 cards by total gain):
  - Card name + set + link to card detail
  - Qty held, cost basis, current value, total gain, ROI %
- [x] 4.14 Add worst performers section (bottom 5-10 cards by total gain):
  - Same columns as top performers, reuse partial
- [x] 4.15 Add `POST /portfolio/refresh` endpoint to PortfolioController (triggers on-demand refresh, returns updated summary)
- [x] 4.16 Add `GET /portfolio/realized-gains` endpoint for all-time realized gains (year filtering deferred)
- [x] 4.17 Write unit tests for orchestrator, presenter, and controller

**PR boundary: 4B ships as one PR.**

---

#### 4C — Set-Level ROI Aggregation

- [x] 4.18 Add set-level aggregation method to `PortfolioSummaryService`:
  - Groups `portfolio_card_performance` rows by set (join card -> set)
  - Aggregates: cards held, total invested, current value, gain/loss, ROI %
- [x] 4.19 Add set ROI section to `portfolio.hbs`:
  - Table sorted by total gain descending
  - Set name + link, cards held, invested, current value, gain/loss, ROI %
- [x] 4.20 Write unit tests for set-level aggregation

**PR boundary: 4C can ship with 4B or standalone.**

---

#### 4D — Cash Flow View

- [x] 4.21 Add `getCashFlow(userId)` to `TransactionRepositoryPort` and repository:
  - Aggregates transaction amounts by month
  - Returns: period, total_bought (outflow), total_sold (inflow), net
- [x] 4.22 Add cash flow section to `portfolio.hbs`:
  - Bar chart (Chart.js): buys vs sells by month
  - Net cash flow line overlay
- [x] 4.23 Add `GET /portfolio/cash-flow` endpoint (monthly aggregation)
- [ ] 4.24 Write unit tests for cash flow aggregation

**PR boundary: 4D ships as one PR.**

---

#### 4E — Export Transactions to CSV

- [x] 4.25 Add `GET /transactions/export` endpoint to TransactionController:
  - Returns `text/csv` with `Content-Disposition: attachment` header
  - Columns: Date, Type, Card Name, Set, Collector #, Foil, Quantity, Price Per Unit, Total, Fees, Source, Notes
- [x] 4.26 Add CSV builder method to TransactionOrchestrator (reuses existing `findByUser` + card lookup)
- [x] 4.27 Add "Export CSV" button to transactions page
- [x] 4.28 Write unit tests for CSV generation

**PR boundary: 4E ships as one PR.**

---

#### 4F — Scry ETL Portfolio Summary Job

- [x] 4.29 Add `portfolio-summary` command to Scry CLI (separate from `ingest`)
- [x] 4.30 Implement bulk summary computation in Rust:
  - For each user with inventory: compute total_value, total_cost, total_realized_gain
  - Compute per-card performance rows
  - UPSERT into `portfolio_summary` and `portfolio_card_performance`
- [x] 4.31 Add to deploy scripts / cron configuration (runs after ingest, not coupled to it)
- [x] 4.32 Write Rust tests for portfolio summary computation

**PR boundary: 4F ships as one PR. Can be built in parallel with 4B.**

---

#### Implementation Order

1. **4A** — snapshot tables and service (foundation, no UI)
2. **4B** — dashboard UI (highest user-visible impact)
3. **4E** — CSV export (quick win, independent)
4. **4C** — set-level ROI (groups existing data)
5. **4D** — cash flow chart (new chart, new query)
6. **4F** — Scry ETL job (can start in parallel with 4B once 4A is merged)

---

## File Location Map

```
src/
  core/
    transaction/
      transaction.entity.ts
      transaction.service.ts
      transaction.module.ts
      transaction.repository.port.ts
    portfolio/
      portfolio-value-history.entity.ts
      portfolio-summary.entity.ts               # Phase 4
      portfolio-card-performance.entity.ts      # Phase 4
      portfolio.service.ts
      portfolio-summary.service.ts              # Phase 4
      portfolio.module.ts
      portfolio-value-history.repository.port.ts
      portfolio-summary.repository.port.ts      # Phase 4
      portfolio-card-performance.repository.port.ts  # Phase 4
  database/
    transaction/
      transaction.orm-entity.ts
      transaction.repository.ts
      transaction.mapper.ts
    portfolio/
      portfolio-value-history.orm-entity.ts
      portfolio-value-history.repository.ts
      portfolio-value-history.mapper.ts
      portfolio-summary.orm-entity.ts           # Phase 4
      portfolio-summary.repository.ts           # Phase 4
      portfolio-summary.mapper.ts               # Phase 4
      portfolio-card-performance.orm-entity.ts  # Phase 4
      portfolio-card-performance.repository.ts  # Phase 4
      portfolio-card-performance.mapper.ts      # Phase 4
  http/
    transaction/
      transaction.controller.ts
      transaction.orchestrator.ts
      transaction.presenter.ts
      dto/
        transaction-request.dto.ts
        transaction-response.dto.ts
    portfolio/
      portfolio.controller.ts
      portfolio.orchestrator.ts
      portfolio.presenter.ts                    # Phase 4

scry/src/
  portfolio/
    mod.rs
    service.rs                                  # Phase 3 + Phase 4F (portfolio-summary command)
    repository.rs                               # Phase 3 + Phase 4F (summary/performance queries)
    domain/
      mod.rs
      portfolio_value_snapshot.rs
      portfolio_summary.rs                      # Phase 4F (PortfolioSummaryRow, CardPerformanceRow)

docker/postgres/migrations/
  018_table_transaction.sql
  019_table_portfolio_value_history.sql
  020_table_portfolio_summary.sql               # Phase 4
```

---

## Open Questions

1. ~~**Transaction edit/delete**: Should users be able to edit or delete past
   transactions?~~ **Resolved**: Yes. Delete is implemented. Edit (quantity,
   price, date, source, notes) added in Phase 2.5. No audit trail for MVP —
   edits overwrite in place.
2. **Bulk transaction import**: CSV import for transactions (e.g., from
   TCGPlayer order history)? Deferred — CSV export (4E) ships first.
3. **Trade transactions**: A TRADE type where no cash changes hands but cards
   are exchanged. Deferred — BUY/SELL covers MVP.
4. **Multi-currency**: USD only for now. Scryfall prices are USD.
5. ~~**Portfolio chart granularity**: Just total value, or also break down by
   set / foil / rarity?~~ **Resolved**: Phase 4 adds set-level ROI (4C). Foil/
   rarity breakdowns deferred.
6. ~~**Inventory-transaction relationship**: Should transactions affect
   inventory?~~ **Resolved**: Hybrid model — transactions sync inventory
   (BUY increments, SELL decrements) but direct inventory changes without
   transactions are still allowed. Sync prompt helps backfill untracked items.
7. **Sync prompt for backfill**: When syncing untracked inventory to transactions,
   the BUY transaction is created *without* incrementing inventory (items are
   already there). Need a `skipInventorySync` flag or separate code path.
8. **Performer count**: Top/worst performers default to 10. Should this be
   configurable by the user or fixed? Start fixed, revisit if requested.
9. **Cash flow chart granularity**: Monthly grouping by default. Weekly option
   useful for active traders but adds UI complexity. Start with monthly only.
10. **Portfolio summary staleness indicator**: Show "Last updated X hours ago"
    with visual warning if data is >24h old (stale ETL run).

---

## Additional Considerations (Post Phase 4 Implementation)

### Scry ETL vs NestJS computation parity
The Scry ETL uses a simplified SQL-based average cost approach for realized gains
and per-card performance, while the NestJS side does precise FIFO lot matching.
For users with complex buy/sell histories (many partial sells at different prices),
the two may produce slightly different numbers. This difference is now explicitly
communicated to users via the `computation_method` column on `portfolio_summary`:
- The ETL writes `computation_method = 'average'` when it computes summaries
- The "Recalculate (FIFO)" button writes `computation_method = 'fifo'`
- The UI shows a badge (Average/FIFO) and dynamic tooltip text based on the method
- Users are educated that FIFO is the standard method for tracking real gains

### Portfolio summary table cleanup on user deletion
Both `portfolio_summary` and `portfolio_card_performance` have `ON DELETE CASCADE`
from users, so user deletion is handled. However, if a user sells all cards and
deletes all transactions, stale summary rows remain until the next ETL run or
manual refresh. Consider adding cleanup logic to transaction delete flows.

### Rate limit reset edge case
The refresh rate limit resets based on `last_refresh_date < CURRENT_DATE`. This
uses the database server's timezone. If the app server and database server are in
different timezones, the reset time may be unintuitive. Both should use UTC.

### CSV export scalability
The current CSV export loads all transactions into memory before streaming. For
users with thousands of transactions this is fine, but if bulk import (Open
Question #2) is implemented, consider a streaming/cursor-based approach.

### All tasks complete
All planned tasks are now checked off. The implementation is complete.

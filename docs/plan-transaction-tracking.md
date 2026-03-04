# Transaction Tracking & Portfolio Value History — Implementation Plan

This document tracks the implementation of transaction-based P&L tracking and
portfolio value history. Work spans multiple PRs and sessions.

Last updated: 2026-03-03

---

## Design Decisions

### Transactions are decoupled from inventory
Inventory remains a simple quantity tracker (`card_id, user_id, foil, quantity`).
Transactions are a separate, opt-in financial ledger. When a user modifies
inventory, the UI offers a non-blocking prompt to record a transaction with the
market price pre-filled — but never auto-creates transactions silently.

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

- [ ] 1.1 Create migration `018_table_transaction.sql`
- [ ] 1.2 Add `transaction` to initial schema file for fresh installs
- [ ] 1.3 Create Transaction domain entity (`src/core/transaction/transaction.entity.ts`)
- [ ] 1.4 Create Transaction ORM entity (`src/database/transaction/transaction.orm-entity.ts`)
- [ ] 1.5 Create Transaction mapper (`src/database/transaction/transaction.mapper.ts`)
- [ ] 1.6 Create TransactionRepositoryPort (`src/core/transaction/transaction.repository.port.ts`)
- [ ] 1.7 Create TransactionRepository (`src/database/transaction/transaction.repository.ts`)
- [ ] 1.8 Create TransactionService with CRUD + FIFO lot matching (`src/core/transaction/transaction.service.ts`)
- [ ] 1.9 Create TransactionModule (`src/core/transaction/transaction.module.ts`)
- [ ] 1.10 Register ORM entity and repository port binding in DatabaseModule
- [ ] 1.11 Register TransactionModule in CoreModule
- [ ] 1.12 Write unit tests for TransactionService (CRUD, FIFO logic, validation)
- [ ] 1.13 Write unit tests for TransactionRepository (via mocked port in service tests)

**PR boundary: Phase 1 can ship as a single PR.**

---

### Phase 2 — Transaction UI

- [ ] 2.1 Create TransactionController (`src/http/transaction/transaction.controller.ts`)
- [ ] 2.2 Create TransactionOrchestrator (`src/http/transaction/transaction.orchestrator.ts`)
- [ ] 2.3 Create request/response DTOs (`src/http/transaction/dto/`)
- [ ] 2.4 Create TransactionPresenter (`src/http/transaction/transaction.presenter.ts`)
- [ ] 2.5 Create HttpTransactionModule and register in HttpModule
- [ ] 2.6 Create transaction list view (`views/transactions.hbs`) — user's full transaction history
- [ ] 2.7 Add "Record Transaction" form to card detail page (buy/sell, qty, price pre-filled with market price, date defaulted to today)
- [ ] 2.8 Add transaction summary to card detail page (cost basis, realized gains, unrealized gain)
- [ ] 2.9 Add transaction prompt to inventory update flow (non-blocking "Record a buy/sell?" after +/- quantity)
- [ ] 2.10 Add card-level P&L display: cost basis, current value, gain/loss, ROI %
- [ ] 2.11 Write unit tests for orchestrator and presenter

**PR boundary: Phase 2 may split into 2 PRs (2.1-2.6 core UI, then 2.7-2.11 integration).**

---

### Phase 3 — Portfolio Value History (Scry ETL + Backend + Chart)

#### 3A — Database & NestJS read layer

- [ ] 3.1 Create migration `019_table_portfolio_value_history.sql`
- [ ] 3.2 Add `portfolio_value_history` to initial schema file
- [ ] 3.3 Create PortfolioValueHistory domain entity (`src/core/portfolio/`)
- [ ] 3.4 Create ORM entity, mapper, repository port, repository
- [ ] 3.5 Create PortfolioService with read methods (get history for user, date range)
- [ ] 3.6 Create PortfolioModule, register in CoreModule and DatabaseModule

#### 3B — Scry ETL snapshot step

- [ ] 3.7 Add `portfolio` module to Scry (`scry/src/portfolio/`)
- [ ] 3.8 Implement `calculate_portfolio_values()` — query all users' inventory value
- [ ] 3.9 Implement `save_portfolio_value_history()` — UPSERT snapshots with COALESCE
- [ ] 3.10 Add portfolio snapshot step to `post_ingest_updates()` in `cli/controller.rs`
- [ ] 3.11 Implement retention for `portfolio_value_history` (same tiers as price_history)
- [ ] 3.12 Add retention call to existing `retention` command handler
- [ ] 3.13 Write Rust tests for portfolio snapshot and retention

#### 3C — Chart UI

- [ ] 3.14 Create PortfolioController and PortfolioOrchestrator in HttpModule
- [ ] 3.15 Create portfolio value chart view (line chart: value over time)
- [ ] 3.16 Add chart to inventory page or as a dedicated /portfolio route
- [ ] 3.17 Add cost basis line to chart (for users with transaction data)

**PR boundary: 3A+3B as one PR, 3C as a follow-up.**

---

### Phase 4 — P&L Analytics Dashboard (Future)

- [ ] 4.1 Portfolio dashboard view: total invested, current value, total gain/loss, ROI %
- [ ] 4.2 Top performers: cards with highest realized + unrealized gains
- [ ] 4.3 Worst performers: cards with biggest losses
- [ ] 4.4 Set-level ROI aggregation
- [ ] 4.5 Cash flow view: money in vs money out over time
- [ ] 4.6 Export transactions to CSV

**Phase 4 is future scope. Tasks are placeholders — details TBD after Phases 1-3 ship.**

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
      portfolio.service.ts
      portfolio.module.ts
      portfolio-value-history.repository.port.ts
  database/
    transaction/
      transaction.orm-entity.ts
      transaction.repository.ts
      transaction.mapper.ts
    portfolio/
      portfolio-value-history.orm-entity.ts
      portfolio-value-history.repository.ts
      portfolio-value-history.mapper.ts
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

scry/src/
  portfolio/
    mod.rs
    service.rs
    repository.rs
    domain/
      portfolio_value_snapshot.rs

docker/postgres/migrations/
  018_table_transaction.sql
  019_table_portfolio_value_history.sql
```

---

## Open Questions

1. **Transaction edit/delete**: Should users be able to edit or delete past
   transactions? Leaning yes for corrections, but need to think about audit
   trail implications.
2. **Bulk transaction import**: CSV import for transactions (e.g., from
   TCGPlayer order history)? Likely Phase 4 scope.
3. **Trade transactions**: A TRADE type where no cash changes hands but cards
   are exchanged. Deferred — BUY/SELL covers MVP.
4. **Multi-currency**: USD only for now. Scryfall prices are USD.
5. **Portfolio chart granularity**: Just total value, or also break down by
   set / foil / rarity? Start with total, expand later.

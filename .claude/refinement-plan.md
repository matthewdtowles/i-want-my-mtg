# Refinement Plan: Inventory, Portfolio & Transactions

## Problem Summary

1. **Portfolio is buried inside Inventory conceptually** — the breadcrumb says `Home > Inventory > Portfolio`, the portfolio link lives on the inventory page, and there's no top-level nav for portfolio. Yet portfolio is its own module in core/http/database. The UX doesn't match the architecture.

2. **Transactions are disconnected from Portfolio** — transactions and portfolio are siblings in the UI nav but have no direct navigation between them, despite transactions being the data source for portfolio analytics.

3. **Circular dependencies via `forwardRef`** — `TransactionService → InventoryService` and `PortfolioModule → InventoryModule + TransactionModule` with forwardRefs. This is a code smell.

4. **InventoryService depends on TransactionRepositoryPort directly** — bypasses the service layer to query transaction data for "min quantity" validation. Breaks hexagonal arch.

5. **Duplicated FIFO logic** — `getFifoLotAllocations()` and `computeFifoFromTransactions()` in `TransactionService` are nearly identical algorithms, one with DB queries and one without.

6. **PortfolioSummaryService has too many responsibilities** — it computes FIFO, aggregates inventory values, manages rate limiting, and persists card performance data. Low cohesion.

7. **PortfolioOrchestrator imports TransactionPresenter** — cross-module presenter dependency for `formatGain`.

---

## Phase 1: Break Circular Dependencies (Architecture)

**Goal:** Eliminate all `forwardRef` usage. Establish clear dependency direction.

### 1a. Move cross-service validation to orchestrator layer

The reason `InventoryService` depends on `TransactionRepositoryPort` is to enforce "can't reduce inventory below transaction-derived quantity." This is a cross-cutting validation concern.

**Action:**
- Remove `TransactionRepositoryPort` from `InventoryService` entirely
- Expose `TransactionService.getRemainingQuantity()` (already exists) for orchestrator use
- Move the transaction-derived quantity check into the orchestrator layer:
  - `InventoryOrchestrator.save()` — call `transactionService.getRemainingQuantity()` first, reject if too low
  - `InventoryOrchestrator.delete()` — same check
  - `TransactionService.adjustInventory()` — this internal call can skip the check since transactions are authoritative
- This is consistent with the orchestrator pattern: orchestrators coordinate between services

### 1b. Remove all `forwardRef` usage

With InventoryService no longer depending on TransactionRepositoryPort:
- `InventoryModule` has zero dependency on `TransactionModule`
- `TransactionModule` imports `InventoryModule` (one-way, no forwardRef)
- `PortfolioModule` imports both `InventoryModule` and `TransactionModule` (one-way, no forwardRef needed since neither depends on Portfolio)

**Dependency direction:**
```
PortfolioModule → TransactionModule → InventoryModule
                ↘                  ↗
                  InventoryModule
```

No cycles. No forwardRef.

---

## Phase 2: Consolidate FIFO Logic (DRY)

**Goal:** Single FIFO implementation.

**Action:**
- Keep `computeFifoFromTransactions()` as the single FIFO algorithm (pure, no DB)
- Rewrite `getFifoLotAllocations()` to fetch data then delegate to `computeFifoFromTransactions()`
- Same for `getCostBasis()` — fetch, then delegate

---

## Phase 3: Decompose PortfolioSummaryService (Cohesion)

**Goal:** Split into focused services.

**Action:**
- **`PortfolioSummaryService`** — reads/writes portfolio_summary, rate-limit checks, delegates computation
- **`PortfolioComputationService`** — the `computeSummary()` method and FIFO aggregation logic. Pure calculation engine. Takes inventory + transactions as input, returns computed summary. No DB writes.
- Keep `PortfolioService` (value history reads) as-is — it's already focused

This gives us:
- `PortfolioComputationService` — pure computation, easily testable
- `PortfolioSummaryService` — orchestrates refresh flow, rate limits, persistence
- `PortfolioService` — value history reads

---

## Phase 4: Fix Cross-Module Presenter Dependency

**Goal:** No HTTP module should import another module's presenter.

**Action:**
- `PortfolioOrchestrator` uses `TransactionPresenter.formatGain()` and `TransactionPresenter.gainSign()`
- Move shared formatting (`formatGain`, `formatCurrency`, `gainSign`) to `src/http/base/http.util.ts` (which already has `toDollar`, `completionRate`)
- Both `TransactionPresenter` and `PortfolioPresenter` delegate to the shared utils
- Remove the import of `TransactionPresenter` from `PortfolioOrchestrator`

---

## Phase 5: UI Navigation & Conceptual Grouping

**Goal:** Portfolio and Transactions should feel related and accessible, not hidden under Inventory.

**Action:**
- **Update breadcrumbs:**
  - Portfolio: `Home > Portfolio` (not `Home > Inventory > Portfolio`)
  - Transactions: `Home > Transactions`
  - Inventory: `Home > Inventory`
- **Add cross-navigation links:**
  - Portfolio page: link to Transactions ("View Transactions")
  - Transactions page: link to Portfolio ("View Portfolio")
  - Inventory page: keep link to Portfolio, add link to Transactions
- **Consider a nav group** (if there's a nav bar): group Inventory, Portfolio, Transactions under a "Collection" dropdown or similar

This makes the three concepts peers rather than parent-child, which matches how the backend already treats them.

---

## Phase 6: Repository Port Organization

**Goal:** Consistent port file organization.

Currently portfolio has 3 port files loose in `src/core/portfolio/`. Inventory has its port in `src/core/inventory/`. Transaction has its port in `src/core/transaction/`.

**Action:**
- Create `ports/` subdirectory in each core module for port interfaces
- Move existing port files: `*.repository.port.ts` → `ports/` in each module
- Minor structural cleanup for consistency

---

## Execution Priority

| Priority | Phase | Impact | Risk |
|----------|-------|--------|------|
| 1 | Phase 1 (circular deps) | High — architectural correctness | Medium — touches service wiring |
| 2 | Phase 2 (DRY FIFO) | Medium — maintainability | Low — pure refactor |
| 3 | Phase 4 (presenter fix) | Low — clean boundaries | Low — move utilities |
| 4 | Phase 3 (decompose service) | Medium — cohesion | Medium — new service + tests |
| 5 | Phase 5 (UI navigation) | High — user experience | Low — template changes |
| 6 | Phase 6 (port org) | Low — consistency | Low — file moves |

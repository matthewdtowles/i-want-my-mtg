# Refinement Plan: Inventory, Portfolio & Transactions

## Problem Summary

1. ~~**Portfolio is buried inside Inventory conceptually** — the breadcrumb says `Home > Inventory > Portfolio`, the portfolio link lives on the inventory page, and there's no top-level nav for portfolio. Yet portfolio is its own module in core/http/database. The UX doesn't match the architecture.~~ **RESOLVED**

2. ~~**Transactions are disconnected from Portfolio** — transactions and portfolio are siblings in the UI nav but have no direct navigation between them, despite transactions being the data source for portfolio analytics.~~ **RESOLVED**

3. ~~**Circular dependencies via `forwardRef`** — `TransactionService → InventoryService` and `PortfolioModule → InventoryModule + TransactionModule` with forwardRefs. This is a code smell.~~ **RESOLVED**

4. ~~**InventoryService depends on TransactionRepositoryPort directly** — bypasses the service layer to query transaction data for "min quantity" validation. Breaks hexagonal arch.~~ **RESOLVED**

5. ~~**Duplicated FIFO logic** — `getFifoLotAllocations()` and `computeFifoFromTransactions()` in `TransactionService` are nearly identical algorithms, one with DB queries and one without.~~ **RESOLVED**

6. ~~**PortfolioSummaryService has too many responsibilities** — it computes FIFO, aggregates inventory values, manages rate limiting, and persists card performance data. Low cohesion.~~ **RESOLVED**

7. ~~**PortfolioOrchestrator imports TransactionPresenter** — cross-module presenter dependency for `formatGain`.~~ **RESOLVED**

---

## Phase 1: Break Circular Dependencies (Architecture) — DONE

**Goal:** Eliminate all `forwardRef` usage. Establish clear dependency direction.

**Status:** Complete. All tests passing (639/639).

### 1a. Move cross-service validation to orchestrator layer — DONE

- Removed `TransactionRepositoryPort` from `InventoryService` entirely
- `InventoryService.save()` and `delete()` are now simple data operations without transaction validation
- Moved transaction-derived quantity check into `InventoryOrchestrator`:
  - `InventoryOrchestrator.save()` calls `transactionService.getRemainingQuantity()`, throws `BadRequestException` if too low
  - `InventoryOrchestrator.delete()` — same check
  - Added `HttpException` re-throw pattern in catch blocks so validation errors propagate correctly
- `TransactionService.adjustInventory()` calls `inventoryService.save()` directly (skips check since transactions are authoritative)

**Files changed:**
- `src/core/inventory/inventory.service.ts` — removed `TransactionRepositoryPort` dep and `getTransactionDerivedQuantity()`
- `src/http/inventory/inventory.orchestrator.ts` — added `TransactionService` injection and validation logic
- `test/core/inventory/inventory.service.spec.ts` — removed `TransactionRepositoryPort` mock and transaction validation tests
- `test/http/inventory.orchestrator.spec.ts` — added `TransactionService` mock and validation tests

### 1b. Remove all `forwardRef` usage — DONE

- `TransactionModule` — removed `forwardRef(() => InventoryModule)`, uses direct `InventoryModule` import
- `PortfolioModule` — removed `forwardRef` from both `InventoryModule` and `TransactionModule` imports

**Dependency direction (no cycles):**
```
PortfolioModule → TransactionModule → InventoryModule
              ↘                    ↗
                InventoryModule
```

**Files changed:**
- `src/core/transaction/transaction.module.ts`
- `src/core/portfolio/portfolio.module.ts`

---

## Phase 2: Consolidate FIFO Logic (DRY) — DONE

**Goal:** Single FIFO implementation.

**Status:** Complete. `getFifoLotAllocations()` now delegates to `computeFifoFromTransactions()`.

- `computeFifoFromTransactions()` is the single FIFO algorithm (pure, no DB)
- `getFifoLotAllocations()` fetches buy lots and sells from the repository, then delegates to `computeFifoFromTransactions()`
- `getCostBasis()` already delegated to `getFifoLotAllocations()` — no change needed

**Files changed:**
- `src/core/transaction/transaction.service.ts` — rewrote `getFifoLotAllocations()` body

---

## Phase 3: Decompose PortfolioSummaryService (Cohesion) — DONE

**Goal:** Split into focused services.

**Status:** Complete. Computation logic extracted to `PortfolioComputationService`.

- Created `PortfolioComputationService` with `compute()` method — pure computation engine that takes userId, inventory items, transactions, and total value; returns computed summary + per-card performance data. No DB reads or writes.
- `PortfolioSummaryService.computeSummary()` now orchestrates: fetches data (parallelized with `Promise.all`), delegates to computation service, persists performance results
- `PortfolioService` (value history reads) unchanged — already focused

**Services after decomposition:**
- `PortfolioComputationService` — pure computation, easily testable
- `PortfolioSummaryService` — orchestrates refresh flow, rate limits, persistence
- `PortfolioService` — value history reads

**Files changed:**
- `src/core/portfolio/portfolio-computation.service.ts` — new file
- `src/core/portfolio/portfolio-summary.service.ts` — delegates to computation service
- `src/core/portfolio/portfolio.module.ts` — added `PortfolioComputationService` provider
- `test/core/portfolio/portfolio-summary.service.spec.ts` — added `PortfolioComputationService` to test providers

---

## Phase 4: Fix Cross-Module Presenter Dependency — DONE

**Goal:** No HTTP module should import another module's presenter.

**Status:** Complete. Shared formatting moved to `http.util.ts`.

- Moved `formatGain`, `formatRoi`, `gainSign` to `src/http/base/http.util.ts`
- `TransactionPresenter` keeps static methods that delegate to the shared utils (backward compatible within transaction module)
- `PortfolioPresenter` imports directly from `http.util.ts` — no more `TransactionPresenter` import
- `PortfolioOrchestrator` imports `formatGain`/`gainSign` from `http.util.ts` — no more `TransactionPresenter` import

**Files changed:**
- `src/http/base/http.util.ts` — added `formatGain`, `formatRoi`, `gainSign`
- `src/http/transaction/transaction.presenter.ts` — delegates to shared utils
- `src/http/portfolio/portfolio.presenter.ts` — imports from `http.util.ts`
- `src/http/portfolio/portfolio.orchestrator.ts` — imports from `http.util.ts`

---

## Phase 5: UI Navigation & Conceptual Grouping — DONE

**Goal:** Portfolio and Transactions should feel related and accessible, not hidden under Inventory.

**Status:** Complete. Breadcrumbs updated and cross-navigation links added.

- **Updated breadcrumbs:**
  - Portfolio: `Home > Portfolio` (removed `Inventory` parent)
  - Transactions: `Home > Transactions` (unchanged, was already correct)
  - Inventory: `Home > Inventory` (unchanged, was already correct)
- **Added cross-navigation links:**
  - Portfolio page: links to Inventory + Transactions (above the refresh section)
  - Transactions page: link to Portfolio (next to Export CSV button)
  - Inventory page: link to Transactions (next to existing Portfolio link, renamed "Portfolio Chart" → "Portfolio")
- **Nav group:** Not implemented — navbar already has top-level links for Inventory and Transactions; Portfolio is accessible from both pages. A nav dropdown can be considered in a future UX pass.

**Files changed:**
- `src/http/portfolio/portfolio.orchestrator.ts` — breadcrumb update
- `src/http/views/portfolio.hbs` — cross-nav links
- `src/http/views/inventory.hbs` — added Transactions link
- `src/http/views/transactions.hbs` — added Portfolio link
- `test/http/portfolio/portfolio.orchestrator.spec.ts` — breadcrumb count assertion updated

---

## Phase 6: Repository Port Organization — DEFERRED

**Goal:** Consistent port file organization.

**Status:** Not started. Lowest priority and lowest impact. Can be picked up in a future cleanup pass.

Currently portfolio has 3 port files loose in `src/core/portfolio/`. Inventory has its port in `src/core/inventory/`. Transaction has its port in `src/core/transaction/`.

**Action (when ready):**
- Create `ports/` subdirectory in each core module for port interfaces
- Move existing port files: `*.repository.port.ts` → `ports/` in each module
- Update all imports across the codebase

---

## Execution Priority

| Priority | Phase | Impact | Risk | Status |
|----------|-------|--------|------|--------|
| 1 | Phase 1 (circular deps) | High — architectural correctness | Medium — touches service wiring | DONE |
| 2 | Phase 2 (DRY FIFO) | Medium — maintainability | Low — pure refactor | DONE |
| 3 | Phase 4 (presenter fix) | Low — clean boundaries | Low — move utilities | DONE |
| 4 | Phase 3 (decompose service) | Medium — cohesion | Medium — new service + tests | DONE |
| 5 | Phase 5 (UI navigation) | High — user experience | Low — template changes | DONE |
| 6 | Phase 6 (port org) | Low — consistency | Low — file moves | DEFERRED |

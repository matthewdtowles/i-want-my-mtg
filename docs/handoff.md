# Handoff: Transactions Phase 4 — Computation Method & Final Tasks

## What Changed

### Problem
The portfolio "Refresh" button and Scry ETL cron job both produce portfolio snapshots but use different cost basis methodologies (FIFO vs average). Calling both "Refresh" was misleading.

### Solution
Differentiated the two computation methods in both the database and UI, making it clear that the default snapshot uses **average cost basis** (from ETL) and the recalculate button uses **FIFO cost basis** (precise lot matching).

## Files Modified

### Database & Schema
- **`docker/postgres/migrations/022_add_computation_method.sql`** — New migration adding `computation_method varchar(10) NOT NULL DEFAULT 'average'` to `portfolio_summary`
- **`docker/postgres/init/001_complete_schema.sql`** — Updated for fresh installs

### Backend (NestJS)
- **`src/core/portfolio/portfolio-summary.entity.ts`** — Added `ComputationMethod` type (`'average' | 'fifo'`) and field to domain entity
- **`src/database/portfolio/portfolio-summary.orm-entity.ts`** — Added TypeORM column mapping
- **`src/database/portfolio/portfolio-summary.mapper.ts`** — Added `computationMethod` to `toCore()` and `toOrmEntity()`
- **`src/core/portfolio/portfolio-summary.service.ts`** — `refreshSummary()` now writes `computationMethod: 'fifo'`
- **`src/http/portfolio/portfolio.presenter.ts`** — Added `isFifo: boolean` to view data

### Backend (Scry ETL)
- **`scry/src/portfolio/repository.rs`** — Updated `save_summaries()` to include `computation_method` column, always writes `'average'`

### UI
- **`src/http/views/portfolio.hbs`** — Renamed button to "Recalculate (FIFO)", added FIFO/Average badge, dynamic tooltips explaining the methodology difference

### Tests
- **`test/http/card.orchestrator.spec.ts`** — 8 new tests for untracked quantity calculation (task 2.29)
- **`test/core/portfolio/portfolio-summary.service.spec.ts`** — Test for `computationMethod: 'fifo'` on refresh
- **`test/http/portfolio/portfolio.orchestrator.spec.ts`** — Tests for `isFifo` flag derivation

### Docs
- **`docs/plan-transaction-tracking.md`** — All tasks marked complete

## Status
- All 618 tests pass (40 suites)
- Rust compiles cleanly (`cargo check`)
- Migration ready to run: `docker compose run --rm migrate`
- Branch: `transactions-phase4`

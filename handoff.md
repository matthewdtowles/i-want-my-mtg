# Session Handoff

Branch: `bulk-import`

## What was done

### 1. Card preview context menu fix
**File:** `src/http/public/js/cardPreview.js`

Added `handleContextMenu` listener that calls `preventDefault()` when a long-press is active. Suppresses the browser's native context menu (right-click on desktop, press-and-hold menu on mobile) during card image previews without affecting normal context menu behavior elsewhere.

### 2. Roadmap reordering
**File:** `roadmap.md`

Reordered incomplete 2.x items:
- **2.8** Bulk Upload Transactions (done)
- **2.9** Improve Site Copy and UX Guidance
- **2.10** Restructure Set Blocking UI for Set Lists (new item)
- **2.11** Support Flavor Name
- **2.12** Price Notifications (moved to last)

### 3. Bulk Upload Transactions (roadmap 2.8) - complete

#### Shared extraction (hexagonal architecture)
Extracted card lookup and foil resolution logic that was inline in `InventoryImportService` into a shared injectable service. Both inventory and transaction import now use it.

- `src/core/import/import.types.ts` — Shared `ImportError` and `ImportResult` interfaces
- `src/core/import/card-import-resolver.ts` — Card resolution by id, set_code+number, or name+set_code; foil resolution with fallback logic
- `src/core/import/import.module.ts` — NestJS module providing `CardImportResolver`
- `src/core/inventory/import/inventory-import.types.ts` — Re-exports shared types; keeps inventory-specific `CardImportRow` and `SetImportRow`

#### Transaction import (core)
- `src/core/transaction/import/transaction-import.types.ts` — `TransactionImportRow` with 12 CSV columns: id, name, set_code, number, type, quantity, price_per_unit, foil, date, source, fees, notes
- `src/core/transaction/import/transaction-import.service.ts` — Processes rows sequentially, uses `CardImportResolver` for card lookup, calls `TransactionService.create()` for each valid row (reuses existing inventory-transaction consistency: BUY increments inventory, SELL validates remaining quantity). Best-effort: valid rows succeed even if others fail.

#### CSV parser (HTTP layer)
- `src/http/hbs/transaction/parsers/transaction-csv.parser.ts` — Parses CSV buffer, validates headers, trims values, caps at 2000 rows

#### Controller & orchestrator wiring
- `src/http/hbs/transaction/transaction.controller.ts` — `POST /transactions/import` with `FileInterceptor`, `UploadRateLimitGuard`, renders shared `importResult` template with dynamic back links
- `src/http/hbs/transaction/transaction.orchestrator.ts` — `importTransactions()` delegates to service, builds error CSV for download

#### Template updates
- `src/http/views/importResult.hbs` — Made back links dynamic (`backUrl`, `backLabel`, `importUrl` with inventory fallbacks) so both inventory and transaction imports share the template
- `src/http/views/transactions.hbs` — Added "Import CSV" button in header actions and in empty state, with hidden file input forms posting to `/transactions/import`

#### Module registrations
- `src/core/core.module.ts` — Added `ImportModule`
- `src/core/inventory/inventory.module.ts` — Added `ImportModule` import
- `src/core/transaction/transaction.module.ts` — Added `ImportModule` import, registered `TransactionImportService`
- `src/http/hbs/hbs.module.ts` — Added `UploadRateLimitGuard` as shared provider

#### Refactored
- `src/core/inventory/import/inventory-import.service.ts` — Now injects `CardImportResolver` instead of doing inline card lookup. Removed private `resolveFoil` (delegated to resolver). `parseBool` kept for set-specific boolean fields.

### 4. Dev cache-busting version bump
**File:** `package.json`

Added `npm run bump:dev` — runs `npm version prerelease --preid=rc --no-git-tag-version`. Produces `1.16.2-rc.0`, `1.16.2-rc.1`, etc. for local SW cache busting without real version bumps.

## Tests
- 49 new tests added (19 CardImportResolver, 21 TransactionImportService, 9 TransactionCsvParser)
- 788 total tests passing across 54 suites
- Existing InventoryImportService and TransactionOrchestrator tests updated for new dependencies

## Key design decision
Transaction import reuses `TransactionService.create()` which already enforces inventory-transaction consistency. The shared `CardImportResolver` eliminates card lookup duplication. No consistency logic was duplicated.

## Not done / next steps
- Integration tests for the transaction import endpoint
- The import-export guide page (`/inventory/import-export-guide`) doesn't document the transaction CSV format yet — natural fit for 2.9 (site copy)
- Visual testing of the import flow in Docker (build, upload a CSV, verify result page)

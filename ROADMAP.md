# Roadmap

## Phase 1: Foundation & Infrastructure

### 1.1 Migrate DB from Docker to Managed Instance
- [x] Evaluate managed Postgres providers — chose AWS Lightsail Managed DB
- [x] Upgrade local dev Postgres from 15 to 18 (docker-compose.yml)
- [x] Fix docker-compose.yml DATABASE_URL to construct from POSTGRES_* vars (postgres hostname)
- [x] Verify PG 18 compatibility (ingest, web app, user registration all working)
- [x] Plan migration strategy — chose pg_dump/pg_restore (simple, cross-version compatible)
- [x] Set up Lightsail managed PostgreSQL 18 instance (`iwantmymtg-db`)
- [x] Configure networking (Lightsail web instance → managed DB)
- [x] Migrate production data (pg_dump/pg_restore — verified row counts match)
- [x] Install postgresql-client on Lightsail web instance
- [x] Add `db-managed` alias to deploy script for managed DB access
- [x] Point production app at managed DB (update .env DATABASE_URL with `?sslmode=require`)
- [x] Update deploy script — remove POSTGRES_* vars, update DB_HOST/DB_PORT for managed DB
- [x] Update docker-compose.prod.yml — remove postgres/migrate services and postgres_prod_data volume
- [x] Update migrations to run against managed DB (run_migrations.sh with managed DB host)
- [x] Fix migration script quoting — DATABASE_URL `?sslmode=require` broke under `nullglob`
- [x] Add SSL config for managed DB — `ssl: { rejectUnauthorized: false }` in TypeORM
- [x] Fix sslmode conflict — strip `sslmode` from URL so TypeORM ssl config takes effect
- [x] Remove VACUUM ANALYZE calls from Scry retention command (managed DB handles autovacuum)
- [x] Remove `health --price-history` bloat/vacuum monitoring (not needed with managed DB)
- [x] Decommission Docker postgres volumes on server (reclaimed ~1.4GB)
- [x] Verify backups and point-in-time recovery (auto backups enabled, 5-min PITR for 7 days)
- [x] Update CLAUDE.md and documentation

### 1.2 Split Scry into Separate Repository
- [x] Create new `scry` repository
- [x] Move `scry/` directory contents to new repo root
- [x] Set up standalone CI/CD (build, test, Docker image push)
- [x] Update container registry tags and deploy script for separate ETL image
- [x] Remove `scry/` from web app repo
- [x] Update web app CI to remove ETL build step
- [x] Update web app Docker Compose to pull ETL image from new repo's registry
- [x] Update documentation in both repos

### 1.3 Integration Test Suite
- [x] Choose integration test strategy — e2e with real DB via Docker test container
- [x] Set up test database provisioning (docker-compose.test.yml, postgres on port 5433 with tmpfs)
- [x] Write integration tests for auth flow (login, logout, cookie handling, guard enforcement)
- [x] Write integration tests for inventory CRUD (create, update, delete)
- [x] Write integration tests for transaction CRUD and FIFO calculations
- [x] Write integration tests for portfolio computation
- [x] Write integration tests for card/set search and filtering (public endpoints, search, spoilers)
- [x] Add integration test step to CI pipeline
- [x] Document how to run integration tests locally

### 1.4 Create API Layer
- [x] Design REST API structure (versioned: `/api/v1/`)
- [x] Decide on auth strategy for API clients (JWT bearer tokens + cookie fallback)
- [x] Implement API controllers separate from view controllers
- [x] Card endpoints: search, detail, prices, price history
- [x] Set endpoints: list, detail, cards in set, prices
- [x] Inventory endpoints: list, add, update, delete
- [x] Transaction endpoints: list, create, update, delete, cost basis
- [x] Portfolio endpoints: summary, value history, card performance, cash flow, realized gains, refresh
- [x] User/auth endpoints: login, profile, update, password, delete
- [x] Add API documentation (OpenAPI/Swagger at `/api/docs`)
- [x] Add API-specific error response format (`ApiResponseDto` envelope)
- [x] Add rate limiting for API endpoints (`ApiRateLimitGuard`)
- [ ] Add API integration tests

### 1.5 Future: SPA Migration
- [ ] Evaluate migrating SSR views to SPA (React/Vue) consuming the API layer
- [ ] Consider migrating to 100% Bearer token auth (drop cookie-based auth)

---

## Phase 2: Web App Improvements

### 2.1 Convert Pagination/Sorting/Filtering to AJAX
- [ ] Identify all paginated views (cards, sets, inventory, transactions)
- [ ] Create shared client-side JS module for AJAX table loading
- [ ] Add JSON response support to existing controllers (or use API layer)
- [ ] Convert card list pagination/sort/filter to AJAX
- [ ] Convert set list pagination/sort/filter to AJAX
- [ ] Convert inventory list pagination/sort/filter to AJAX
- [ ] Convert transaction list pagination/sort/filter to AJAX
- [ ] Add loading states and error handling in UI
- [ ] Update URL query params on AJAX navigation (back button support)
- [ ] Test across browsers

### 2.2 Add Pre-fetching for Performance
- [ ] Audit current page load performance (identify bottlenecks)
- [ ] Add link pre-fetching for likely navigation targets
- [ ] Evaluate and add resource hints (preconnect, prefetch, preload)
- [ ] Add caching headers for static assets and API responses
- [ ] Consider service worker for offline card data caching
- [ ] Measure improvement

### 2.3 SEO
- [ ] Add meta tags (title, description, og:image) to all public pages
- [ ] Add structured data (JSON-LD) for card pages
- [ ] Generate sitemap.xml for public card and set pages
- [ ] Add robots.txt
- [ ] Ensure server-rendered HTML is crawlable (already SSR, so mostly meta/structure)
- [ ] Add canonical URLs
- [ ] Submit sitemap to Google Search Console

### 2.4 Feature: Binder View
- [ ] Design binder layout (grid of card images, page-like grouping)
- [ ] Implement binder view component/template
- [ ] Add toggle between list view and binder view
- [ ] Support sorting within binder (by set, color, type, price)
- [ ] Add binder view for inventory (user's collection)
- [ ] Persist view preference per user

### 2.5 Feature: Price Notifications
- [ ] Design notification data model (user preferences, thresholds, history)
- [ ] Create notification preferences UI (per-card price alerts, portfolio alerts)
- [ ] Implement price change detection during ingestion
- [ ] Implement email notification delivery
- [ ] Add notification history/log view
- [ ] Consider in-app notifications in addition to email
- [ ] Add unsubscribe/manage preferences flow

### 2.6 Feature: Bulk Upload Transactions
- [ ] Design bulk upload flow (CSV file format, UI for upload)
- [ ] Create CSV template/documentation for expected format
- [ ] Implement file upload endpoint and CSV parsing
- [ ] Validate and preview parsed transactions before committing
- [ ] Handle errors and partial failures (report which rows failed and why)
- [ ] Add bulk upload UI to transactions page

### 2.7 Toast Notifications for Failed Inventory Updates
- [ ] Add toast/notification component to UI
- [ ] Detect inventory update failures caused by transaction constraints (e.g., removing items that active transactions depend on)
- [ ] Return descriptive error messages from backend explaining why the update was blocked
- [ ] Display toast message to user with actionable context (e.g., "Cannot remove item — referenced by an active Buy transaction")
- [ ] Ensure toast works across all inventory update paths (add, remove, adjust quantity)

### 2.8 Improve Site Copy and UX Guidance
- [ ] Audit current site copy for clarity and completeness
- [ ] Add onboarding guidance for new users (explain core features: inventory, transactions, portfolio)
- [ ] Add contextual help text and tooltips to key pages
- [ ] Improve empty states with helpful prompts (e.g., "No cards in inventory — search for cards to add")
- [ ] Review navigation flow and improve discoverability of features
- [ ] Update page headings, labels, and descriptions for consistency

### 2.9 Support Flavor Name
- [ ] Verify Scryfall API provides flavor_name data
- [ ] Add flavor_name column to card table (migration)
- [ ] Update Scry card ingestion to store flavor_name
- [ ] Display flavor_name on card detail page where applicable
- [ ] Add flavor_name to card search if relevant

---

## Phase 3: Data Expansion

### 3.1 Add Support for Sealed Product
- [ ] Research Scryfall or other data sources for sealed product data
- [ ] Design sealed product data model (tables, relationships to sets)
- [ ] Create database migration for sealed product tables
- [ ] Add sealed product ingestion to Scry
- [ ] Create sealed product views (list, detail)
- [ ] Add sealed product to inventory tracking
- [ ] Add sealed product pricing and price history

---

## Phase 4: Architecture

### 4.1 Evaluate Removing NestJS Dependency
- [ ] Audit current NestJS features used (DI, guards, pipes, interceptors, etc.)
- [ ] Evaluate lightweight alternatives (Fastify standalone, Express + tsyringe, etc.)
- [ ] Compare dependency tree size (before/after)
- [ ] Decide: migrate or keep NestJS
- [ ] If migrating: plan incremental migration strategy
- [ ] If migrating: execute migration module by module
- [ ] If keeping: document decision and rationale

### 4.2 Scry: Interactive Mode
- [ ] Design interactive CLI menu (select commands, configure options)
- [ ] Add interactive mode entry point (`cargo run -- interactive` or default)
- [ ] Add interactive selection for ingestion targets (sets, cards, prices)
- [ ] Add progress display and confirmation prompts
- [ ] Add dry-run option for destructive operations

---

## Phase 5: Platform Expansion

### 5.1 Desktop App
- [ ] Choose framework (Electron vs Tauri)
- [ ] Scaffold desktop app project in new repo
- [ ] Integrate with API layer for data
- [ ] Implement core views: collection, card search, portfolio
- [ ] Add desktop-specific features (system tray, notifications)
- [ ] Set up CI/CD for desktop builds (Windows, macOS, Linux)
- [ ] Distribution strategy (GitHub releases, auto-update)

### 5.2 Apple Mobile App
- [ ] Choose framework (Swift native vs React Native vs Flutter)
- [ ] Scaffold iOS app project in new repo
- [ ] Integrate with API layer
- [ ] Implement core views: collection, card search, portfolio
- [ ] Add mobile-specific features (camera for card scanning, push notifications)
- [ ] TestFlight beta distribution
- [ ] App Store submission

### 5.3 Android Mobile App
- [ ] Choose framework (Kotlin native vs React Native vs Flutter)
- [ ] Scaffold Android app project in new repo
- [ ] Integrate with API layer
- [ ] Implement core views: collection, card search, portfolio
- [ ] Add mobile-specific features (camera for card scanning, push notifications)
- [ ] Internal testing distribution
- [ ] Play Store submission

### 5.4 Import Inventory by Picture
- [ ] Research card recognition APIs/libraries (Scryfall image matching, ML models)
- [ ] Design image upload and processing flow
- [ ] Implement image capture UI (web + mobile)
- [ ] Implement card identification from image
- [ ] Add review/confirm step before adding to inventory
- [ ] Handle multiple cards in single image
- [ ] Test accuracy and iterate on recognition

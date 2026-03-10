# Roadmap

## Phase 1: Foundation & Infrastructure

### 1.1 Migrate DB from Docker to Managed Instance
- [x] Evaluate managed Postgres providers — chose AWS Lightsail Managed DB
- [x] Upgrade local dev Postgres from 15 to 18 (docker-compose.yml)
- [x] Fix docker-compose.yml DATABASE_URL to construct from POSTGRES_* vars (postgres hostname)
- [x] Verify PG 18 compatibility (ingest, web app, user registration all working)
- [ ] Plan migration strategy (dump/restore vs replication)
- [ ] Set up Lightsail managed PostgreSQL 18 instance
- [ ] Configure networking (Lightsail web instance → managed DB)
- [ ] Add SSL/TLS support for production DB connections (`?sslmode=require`)
- [ ] Migrate production data (pg_dump/pg_restore)
- [ ] Update deploy script — remove POSTGRES_* vars, DB_HOST/DB_PORT for production
- [ ] Update docker-compose.prod.yml — remove postgres/migrate services and postgres_prod_data volume
- [ ] Verify backups and point-in-time recovery
- [ ] Update CLAUDE.md and documentation

### 1.2 Split Scry into Separate Repository
- [ ] Create new `scry` repository
- [ ] Move `scry/` directory contents to new repo root
- [ ] Set up standalone CI/CD (build, test, Docker image push)
- [ ] Update container registry tags and deploy script for separate ETL image
- [ ] Remove `scry/` from web app repo
- [ ] Update web app CI to remove ETL build step
- [ ] Update web app Docker Compose to pull ETL image from new repo's registry
- [ ] Update documentation in both repos

### 1.3 Integration Test Suite
- [ ] Choose integration test strategy (e2e with real DB vs test containers)
- [ ] Set up test database provisioning (Docker test container or dedicated test DB)
- [ ] Write integration tests for auth flow (register, verify, login, logout)
- [ ] Write integration tests for inventory CRUD
- [ ] Write integration tests for transaction CRUD and FIFO calculations
- [ ] Write integration tests for portfolio computation
- [ ] Write integration tests for card/set search and filtering
- [ ] Add integration test step to CI pipeline
- [ ] Document how to run integration tests locally

### 1.4 Create API Layer
- [ ] Design REST API structure (versioned: `/api/v1/`)
- [ ] Decide on auth strategy for API clients (JWT bearer tokens vs session cookies)
- [ ] Implement API controllers separate from view controllers
- [ ] Card endpoints: search, detail, prices, price history
- [ ] Set endpoints: list, detail, cards in set, prices
- [ ] Inventory endpoints: list, add, update, delete
- [ ] Transaction endpoints: list, create, delete, cost basis
- [ ] Portfolio endpoints: summary, value history, card performance
- [ ] User/auth endpoints: login, register, profile
- [ ] Add API documentation (OpenAPI/Swagger)
- [ ] Add API-specific error response format
- [ ] Add rate limiting for API endpoints
- [ ] Add API integration tests

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

### 2.6 Support Flavor Name
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

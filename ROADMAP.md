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
- [x] Add API integration tests

### 1.5 Progressive Web Enhancement

- [x] Set list: AJAX paginate/sort/filter (builds core infrastructure)
  - [x] Move SetTypeMapper to shared location (`src/http/base/`)
  - [x] Build SetApiPresenter (TDD) — maps Set domain entity → SetApiResponseDto with tags, parentCode, isMain
  - [x] Add owned data to Set API (TDD) — OptionalAuthGuard, InventoryService injection, completionRate
  - [x] Build client-side AJAX module (`setListAjax.js`) — fetch/sort/filter/paginate via `/api/v1/sets`
  - [x] Add URL state management (pushState for sort/paginate, replaceState for filter, popstate for back)
  - [x] Wire up setListPage.hbs template with container div and deferred script
- [x] Card search/list: AJAX paginate/sort/filter
  - [x] Add `keyruneCode` to Card API DTO (TDD — presenter maps from `card.set.keyruneCode` with `setCode` fallback)
  - [x] Add `@ApiQuery` decorators for `filter` and `baseOnly` on set cards endpoint
  - [x] Build `searchAjax.js` — intercepts form submit, independent card/set pagination, parallel API fetches
  - [x] Build `setCardListAjax.js` — sort/filter/paginate/baseOnly via `/api/v1/sets/:code/cards`
  - [x] Wire search.hbs and set.hbs templates with container divs and deferred scripts
  - [x] Add integration tests for `keyruneCode`, filter, and baseOnly params
  - [x] Scroll position preservation via `min-height` pinning during AJAX content swap
- [x] Inventory list: AJAX paginate/sort/filter + toast notifications on errors
  - [x] Extract global toast utility (`toast.js`) — `window.showToast`/`window.dismissToast` with status-based durations
  - [x] Enrich Inventory API response with display fields (imgSrc, rarity, keyruneCode, prices, tags, url)
  - [x] Add batch inventory quantities endpoint (`GET /api/v1/inventory/quantities?cardIds=...`)
  - [x] Build `inventoryListAjax.js` — filter/sort/paginate/limit/baseOnly via `/api/v1/inventory`
  - [x] Wire inventory +/- and delete controls for AJAX-rendered rows (event delegation compatibility)
  - [x] Wire toast notifications to inventory update/delete failures
  - [x] Replace `—` placeholder in set card list with real +/- inventory controls via quantities endpoint
  - [x] Add presenter unit tests (TDD) and integration tests for enriched fields + quantities endpoint
- [x] Transaction list: AJAX paginate/sort/filter
  - [x] Add TX_DATE, TX_TYPE, TX_CARD, TX_PRICE sort options
  - [x] Add paginated query methods to TransactionRepositoryPort and implement with QueryBuilderHelper
  - [x] Build TransactionApiPresenter (TDD — 10 tests) with card join data (cardUrl, cardNumber)
  - [x] Update TransactionApiController findAll to paginated with SafeQueryOptions + PaginationMeta
  - [x] Build `transactionListAjax.js` — sort/filter/paginate + inline edit/delete via `/api/v1/transactions`
  - [x] Wire transactions.hbs with AJAX container, filter partial, pagination, deferred script
  - [x] Cross-browser testing

### 1.6 Frontend Consolidation

- [x] Remove duplicated AjaxUtils functions from searchAjax.js
- [x] Add renderTags() helper to AjaxUtils and replace inline tag loops
- [x] Fix hover class inconsistency in inventoryCtrl.hbs
- [x] HTML template elements for quantity and delete forms (template cloning)
- [x] Populate deleteInventoryEntry.hbs partial
- [x] Fix mana cost rendering divergence in setCardListAjax.js
- [x] CSS consolidation — extract history-range-btn base class for price history buttons
- [x] Standardize content wrapper elements (div → section)
- [x] Standardize page heading levels (all pages use h1 for primary heading)
- [x] Standardize table structures (w-full, first/last cell padding in CSS)
- [x] Standardize empty state patterns (py-16, icon + message + hint)
- [x] Standardize script loading (defer on all external script tags)
- [x] Standardize filter form wrapping in transactions.hbs
- [x] Delete orphaned partials (priceInfoTooltip, importExportTooltip)
- [x] Add `concat` Handlebars helper for inline string building
- [x] Extract `emptyState.hbs` partial — consolidate 8 empty state patterns
- [x] Extract `statCard.hbs` partial — consolidate simple stat card markup
- [x] Consistent Normal→Foil ordering (inventoryCtrl, set.hbs mobile, AJAX)
- [x] Dynamic price/foil column visibility (set page, card page, AJAX)
- [x] Transaction row `<template>` conversion (template cloning in ajaxUtils)

### 2.1 Add Pre-fetching for Performance

- [x] Resource hints in `<head>` (`main.hbs`)
  - [x] Add `dns-prefetch` for CDN origins (jsdelivr, cdnflare, Google Fonts)
  - [x] Add `preload` for critical CSS (tailwind.css, app.css)
  - [x] Add `preload` for Keyrune and Font Awesome font files (WOFF2)
- [x] Cache headers for static assets
  - [x] Configure `maxAge` on Express static middleware (`app.config.ts`)
  - [x] Add cache-busting query param or versioning strategy for CSS/JS
- [x] Cache headers for API responses
  - [x] Add `CacheControlInterceptor` for GET API endpoints (short TTL, stale-while-revalidate)
  - [x] Set `no-store` for authenticated/user-specific endpoints
- [x] Link prefetching module (`prefetch.js`)
  - [x] Prefetch visible nav links on idle via `requestIdleCallback`
  - [x] Prefetch on hover/touchstart for any internal `<a>` link
  - [x] Respect `Save-Data` header and `prefers-reduced-data`
  - [x] Wire into `main.hbs` layout
- [x] Service worker for offline caching
  - [x] Register service worker from `main.hbs`
  - [x] Precache static assets (CSS, JS, logo) with versioned cache name
  - [x] Cache-first strategy for static assets, network-first for API/pages
  - [x] Offline fallback page
  - [x] Cache card image URLs on visit for offline browsing
- [x] Measure improvement (Lighthouse before/after)

### 2.2 Lighthouse Performance Optimization

- [x] Run Lighthouse audit and document baseline scores
- [x] Optimize render-blocking resources (defer non-critical CSS/JS)
  - [x] Defer `searchSuggest.js` (was synchronous, blocking HTML parsing)
  - [x] Make Google Fonts non-render-blocking (`media="print" onload="this.media='all'"`)
  - [x] Make mana-font CSS non-render-blocking on card/set pages
  - [x] Switch Font Awesome from `all.min.css` to `fontawesome.min.css` + `solid.min.css` (only solid icons used)
  - [x] Upgrade Font Awesome from 6.0.0-beta3 to 6.7.2
  - [x] Pin CDN dependencies to specific versions (keyrune@3.18.0, mana-font@1.18.0)
  - [x] Add `<noscript>` fallbacks for deferred CSS (Google Fonts, keyrune, FA)
- [x] Optimize image loading (lazy loading, proper sizing, modern formats)
  - [x] Add `loading="lazy"` to card images on set, card (other printings), and inventory pages
  - [x] Add `width`/`height` attributes to all images to prevent CLS (logo, card detail, card previews, search results)
  - [x] Add `fetchpriority="high"` to card detail hero image (LCP element)
  - [x] Add `loading="lazy"` + dimensions to AJAX-rendered images (searchAjax, setCardListAjax, inventoryListAjax)
  - [x] Convert logo and background images to WebP (logo: 206KB→56KB, background: 55KB→21KB)
- [x] Reduce unused CSS/JS payload
  - [x] Fix Tailwind content paths (removed `node_modules/@tailwindcss/**/*.js` — 200KB → 122KB, 39% reduction)
  - [x] Remove unused `@tailwindcss/aspect-ratio` plugin
  - [x] Add `--minify` to Tailwind build (122KB → 97KB)
- [x] Minimize main-thread work and reduce JavaScript execution time
  - [x] Defer `searchSuggest.js` eliminates parser-blocking script on every page
- [x] Fix SEO issues
  - [x] Add dynamic `<title>` tags to all pages via `BaseViewDto`
  - [x] Add `<meta name="description">` to all public pages
  - [x] Set `indexable: true` (robots index/follow) on public pages
- [x] Fix accessibility issues
  - [x] Fix heading hierarchy (h4→h2 on search page, mismatched closing tags on card page)
  - [x] Add `aria-label` to buttons with icon-only content (mobile menu, quantity inputs)
  - [x] Fix color contrast ratios (`.header-subtitle`, `.table-link`)
  - [x] Fix `aria-label` mismatch on set page price-info-toggle
- [x] Fix Best Practices issues
  - [x] Fix CORS errors from protocol-relative CDN URLs (changed to explicit `https://`)
  - [x] Add favicon.ico to fix 404 console error (generated from logo, served at `/favicon.ico`)
  - [x] Add `<link rel="icon">` to layout
- [x] Verify improvements with follow-up Lighthouse audit
  - [x] Local: all pages 95+ mobile/desktop (card-detail 91 mobile due to external Scryfall image)
  - [x] Self-hosted mana-font with woff2 (408KB → 187KB)
  - [x] Fixed set-detail CLS (0.291 → 0 desktop) by matching placeholder styles to final font CSS
  - [x] Delayed eager prefetch (3s) to avoid competing with critical resources on slow 4G
  - [x] Optimized logo image (55KB → 4KB, resized to 160x160 for 80x80 display)
  - [x] Production: enable HTML compression in CloudFront (infrastructure — highest-impact remaining fix)

### 2.3 Standardize Card Links

- [x] Create reusable card link partial/template with consistent markup (`cardLink.hbs`)
- [x] Show card image preview on hover (desktop tooltip/popover)
- [x] Long-press on mobile shows image preview (replaced two-tap pattern)
- [x] Use card link partial across all pages (search, set, inventory, transactions, portfolio, card)
- [x] Ensure consistent styling and behavior site-wide
- [x] Add `renderCardLink()` JS utility for AJAX-rendered card links
- [x] Load `cardPreview.js` globally from layout for site-wide coverage
- [x] Single floating preview element (replaces per-link hidden images)
- [x] Respect `prefers-reduced-motion`

### 2.4 Card Image Interactivity & Resolution

- [x] Display higher-resolution card images (use Scryfall `normal` or `large` size)
- [x] Add smooth hover zoom/enlarge effect on card images (desktop)
- [x] Add tap-to-enlarge modal for card images (mobile)
- [x] Add subtle card image animations (fade-in on load, hover lift/shadow)
- [x] Polish card detail page layout — clean, modern feel (inspired by Perplexity aesthetic)
- [x] Ensure image interactions respect `prefers-reduced-motion`

### 2.5 Accessibility Optimization

- [x] Run Lighthouse accessibility audit and document baseline score (95-96 on most pages, 100 on spoilers)
- [x] Add proper ARIA labels and roles to interactive elements (done in 2.2: icon-only buttons, quantity inputs, price-info toggle)
- [x] Fix heading hierarchy (done in 2.2: h4→h2 on search, mismatched tags on card page)
- [x] Fix remaining color contrast failures (btn-primary teal-500→teal-700, btn-secondary purple-600→purple-700, header-subtitle dark gray-400→gray-300)
- [x] Add keyboard navigation support for all interactive features (card preview focusin/focusout, card image modal focus trap + Enter/Space activation, mobile menu aria-expanded)
- [x] Add focus indicators and skip-to-content link (global :focus-visible outline, .skip-link to #main-content)
- [x] Ensure all images have meaningful alt text (done in 2.2: width/height and alt on all images)
- [x] Verify screen reader compatibility for AJAX-updated content (ARIA live region announcer in ajaxUtils + searchAjax)
- [x] Verify improvements with follow-up Lighthouse audit

### 2.6 SEO

- [x] Add meta tags (title, description) to all public pages (done in 2.2: dynamic `<title>`, `<meta description>`, robots directives)
- [x] Add Open Graph tags (og:title, og:description, og:type, og:image, og:url, og:site_name) to all public pages
- [x] Add structured data (JSON-LD) for card pages (Product + BreadcrumbList schemas)
- [x] Generate sitemap.xml for public card and set pages (sitemap index with per-set card sitemaps)
- [x] Add robots.txt (existed; added Sitemap URL)
- [x] Ensure server-rendered HTML is crawlable (already SSR; meta tags and indexable flags in place)
- [x] Add canonical URLs (on all public pages: home, sets, set detail, card detail, spoilers)
- [x] Submit sitemap to Google Search Console

### 2.7 Feature: Binder View

- [x] Design binder layout (grid of card images, page-like grouping)
- [x] Implement binder view component/template
- [x] Add toggle between list view and binder view
- [x] Add binder view for inventory (user's collection)
- [x] Persist view preference (localStorage; per-user DB persistence deferred)
- [x] Add keyboard navigation for binder pages (arrow keys)
- [x] Add owned-only filtering toggle for inventory binder
- [x] Add stepper controls for inventory quantity in binder view
- [x] Maintain scroll position on binder page navigation

### 2.8 Feature: Price Notifications

- [ ] Design notification data model (user preferences, thresholds, history)
- [ ] Create notification preferences UI (per-card price alerts, portfolio alerts)
- [ ] Implement price change detection during ingestion
- [ ] Implement email notification delivery
- [ ] Add notification history/log view
- [ ] Consider in-app notifications in addition to email
- [ ] Add unsubscribe/manage preferences flow

### 2.9 Feature: Bulk Upload Transactions

- [ ] Design bulk upload flow (CSV file format, UI for upload)
- [ ] Create CSV template/documentation for expected format
- [ ] Implement file upload endpoint and CSV parsing
- [ ] Validate and preview parsed transactions before committing
- [ ] Handle errors and partial failures (report which rows failed and why)
- [ ] Add bulk upload UI to transactions page

### 2.10 Improve Site Copy and UX Guidance

- [ ] Audit current site copy for clarity and completeness
- [ ] Add onboarding guidance for new users (explain core features: inventory, transactions, portfolio)
- [ ] Add contextual help text and tooltips to key pages
- [ ] Improve empty states with helpful prompts (e.g., "No cards in inventory — search for cards to add")
- [ ] Review navigation flow and improve discoverability of features
- [ ] Update page headings, labels, and descriptions for consistency

### 2.11 Support Flavor Name

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

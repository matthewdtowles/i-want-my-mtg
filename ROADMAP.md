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

### 2.8 Feature: Bulk Upload Transactions

- [x] Design bulk upload flow (CSV file format, UI for upload)
- [x] Create CSV template/documentation for expected format
- [x] Extract shared CardImportResolver and import types (reused by inventory and transaction import)
- [x] Implement file upload endpoint and CSV parsing (TransactionCsvParser, POST /transactions/import)
- [x] Validate and report errors per row (card resolution, type, quantity, price, date, fees)
- [x] Handle errors and partial failures (best-effort processing, error CSV download)
- [x] Reuse TransactionService.create() for inventory-transaction consistency (no duplicated logic)
- [x] Refactor InventoryImportService to use shared CardImportResolver
- [x] Reuse importResult template with dynamic back links
- [x] Add bulk upload UI to transactions page (Import CSV button in header + empty state)

### 2.9 Improve Site Copy and UX Guidance

- [x] Audit current site copy for clarity and completeness
- [x] Add onboarding guidance for new users (explain core features: inventory, transactions, portfolio)
- [x] Add contextual help text and tooltips to key pages
- [x] Improve empty states with helpful prompts (e.g., "No cards in inventory — search for cards to add")
- [x] Review navigation flow and improve discoverability of features
- [x] Update page headings, labels, and descriptions for consistency
- [x] Create Getting Started guide page (`/guides/getting-started`) with step-by-step feature overview
- [x] Fix text overflow site-wide — fluid clamp() font sizes on page-title, card-title, stat-value, price tiles
- [x] Improve welcome banner with action CTAs (Browse Sets, Import from CSV, Getting Started Guide)
- [x] Improve home hero copy with descriptive tagline and feature callouts
- [x] Fix import/export guide heading hierarchy (h4→h2, h5→h3)
- [x] Add Help (?) icon link in navbar to Getting Started guide
- [x] Contextual first-visit hints (localStorage-gated, one-time tooltips)
  - [x] Binder view discovery: tooltip on `.binder-link` icon first visit ("View as a binder - flip through your cards page by page"), dismissed to `localStorage`
  - [x] Portfolio metric hints: subtle pulsing ring on each stat card with dismissible `?` explaining the metric
  - [x] Import hint on transactions page: if user has transactions but no imports, show dismissible inline tip about CSV import
- [x] Surface cost basis tooltip on Portfolio page header (simplified version of existing `costBasisTooltip.hbs`, for first-time visitors)
- [x] Copy audit for remaining pages
  - [x] `portfolio.hbs` refresh button — more descriptive label ("Recalculate P&L")
  - [x] `transactions.hbs` — add subtitle explaining what transactions are for
  - [x] Error pages (401, 404, 500) — more helpful and brand-consistent
  - [x] `spoilers.hbs` — add brief description of what "spoilers" means in context

### 2.10 Restructure Set Blocking UI for Set Lists

- [x] Audit current set list layout and identify UX pain points
- [x] Design improved set list UI with clearer visual hierarchy
- [x] Implement restructured set list layout
  - [x] Block-level pagination via `SetService.findBlockGroupKeys` and `findSetsByBlockKeys`
  - [x] `SetBlockGroup` DTO for grouped rendering with block name, multi-set flag, aggregate price
  - [x] `BlockPaginationMeta` extends `PaginationMeta` with `multiSetBlockKeys` for client-side grouping
  - [x] `SetListUtils.groupByBlock` mirrors server-side grouping logic in the browser
  - [x] Block label rows and `block-child-row` indentation for multi-set blocks
- [x] Ensure responsive behavior on mobile and desktop
- [x] Update AJAX rendering to match new layout
  - [x] `setListAjax.js` renders block groups when `meta.multiSetBlockKeys` is present
  - [x] Frontend tests for `SetListUtils.groupByBlock` and `setListAjax` rendering

### 2.11 Support Flavor Name

- [x] Verify MTGJSON API provides flavorName data
- [x] Add flavor_name column to card table (migration 023)
- [x] Update Scry card ingestion to store flavor_name (struct, mapper, repository UPSERT)
- [x] Add flavorName to NestJS ORM entity, domain entity, mapper, presenters, and API DTOs
- [x] Display flavor_name on card detail page where applicable (italic subtitle below card name)
- [x] Add flavor_name to card search (OR condition alongside name in applySearchFilter)

### 2.12 Feature: Price Notifications

- [x] Design notification data model (user preferences, thresholds, history)
- [x] Create database migration for price_alert and price_notification tables (migration 025)
- [x] Implement domain entities, repository ports, ORM entities, mappers, and repositories
- [x] Implement PriceAlertService with CRUD and processAlerts() price change detection
- [x] Implement PriceNotificationService with CRUD and mark-as-read operations
- [x] Create REST API endpoints for price alerts (CRUD) and notifications (list, read, read-all)
- [x] Implement price change detection (percentage threshold, comparing current vs previous day)
- [x] Implement email notification delivery (batched per user, HTML template with price table)
- [x] Add process endpoint with API key auth for cron-triggered processing
- [x] Add cron job (daily at 2:15 AM) to trigger price alert processing after ingestion
- [x] Integration tests with 4-card scenario (increase trigger, increase no-trigger, decrease trigger, decrease no-trigger)
- [x] Typed domain errors (`DomainNotFoundError`, `DomainNotAuthorizedError`, `DomainValidationError`) for clean service-to-controller error mapping
- [x] HTML-escape all interpolated values in email templates (XSS/injection prevention)
- [x] Shared `buildCardUrl` utility with URL encoding (moved to `src/shared/utils/card-url.util.ts`)
- [x] Shared `escapeHtml` utility (`src/shared/utils/html.util.ts`)
- [x] Fix card links in alert emails to use card number (not name) matching app route pattern
- [x] Map authorization errors to 404 (not 400) to prevent resource existence leakage
- [x] Validate updates preserve at least one threshold (prevent active alerts with no triggers)
- [x] Idempotent alert processing (skip alerts where `lastNotifiedAt >= CURRENT_DATE`)
- [x] `markAsRead` returns 404 when notification not found or not owned by user
- [x] DB CHECK constraint ensuring at least one threshold is set (migration 026)
- [x] Harden cron job: anchored grep, full-value cut, `curl -sSf` for visible errors
- [x] Fix e2e test env var leak (`PRICE_ALERT_API_KEY` saved/restored in afterAll)
- [x] Enrich API responses with card name, number, and set code (JOIN queries in repositories)
- [x] Price Alerts management page (`/price-alerts`) with AJAX table, inline edit/toggle/delete
- [x] Price Alert form on card detail page (create alerts with increase/decrease % thresholds)
- [x] Notifications history page (`/notifications`) with unread highlighting and mark-as-read
- [x] Navbar links for Alerts (desktop and mobile)
- [x] Hide Owned column on set card list when not authenticated

### 2.13 UI Polish

- [x] Show active price alert indicator on card detail page (badge or icon when user has an alert set for the card)
- [x] Add price info to card overlay in binder view (normal/foil prices in the hover/tap preview)

---

## Phase 3: Monetization Foundation & New Features

### 3.1 Sealed Product Support

#### Database & Schema
- [x] Design sealed product data model (sealed_product, sealed_product_price, sealed_product_price_history, sealed_product_inventory)
- [x] Create migration 027: sealed product tables
- [x] Create migration 028: card purchase URL columns (purchase_url_tcgplayer, purchase_url_tcgplayer_etched)
- [x] Update complete schema file (001_complete_schema.sql)

#### Domain Layer
- [x] Create SealedProduct domain entity with validateInit
- [x] Create SealedProductPrice domain entity
- [x] Create SealedProductInventory domain entity
- [x] Create SealedProductRepositoryPort interface
- [x] Create SealedProductService
- [x] Create SealedProductModule, register in CoreModule

#### Database Layer
- [x] Create ORM entities (sealed_product, sealed_product_price, sealed_product_price_history, sealed_product_inventory)
- [x] Create mappers (SealedProductMapper, SealedProductPriceMapper)
- [x] Create SealedProductRepository implementing port
- [x] Register ORM entities and port binding in DatabaseModule

#### API Layer
- [x] Create SealedProductApiResponseDto, SealedProductInventoryApiDto, request DTOs
- [x] Create SealedProductApiPresenter (TDD)
- [x] Create SealedProductApiController with endpoints:
  - GET /api/v1/sets/:code/sealed-products
  - GET /api/v1/sealed-products/:uuid
  - GET /api/v1/sealed-products/:uuid/price-history
  - GET /api/v1/inventory/sealed (auth)
  - POST /api/v1/inventory/sealed (auth)
  - PATCH /api/v1/inventory/sealed (auth)
  - DELETE /api/v1/inventory/sealed (auth)
- [x] Register in ApiModule

#### View Layer
- [x] Create SealedProductOrchestrator
- [x] Create SealedProductController (/sealed-products/:uuid)
- [x] Create sealed-product-detail.hbs template
- [x] Create sealed-products.hbs partial for set page
- [x] Register in HbsModule

#### Scry ETL (separate repo)
- [x] Create SealedProduct domain struct
- [x] Create mapper: MTGJSON JSON -> SealedProduct (flatten contents, extract TCGPlayer URL, filter online-only)
- [x] Create repository with UPSERT for sealed_product table
- [x] Create service to orchestrate fetch/map/save (streams AllPrintings.json)
- [x] Hook into default ingestion pipeline (runs with `ingest` or `ingest --sealed`)
- [x] Add sealed product price ingestion
- [x] Add card purchase URL ingestion (purchase_url_tcgplayer, purchase_url_tcgplayer_etched)

#### AJAX & Frontend
- [x] Add sealed product AJAX loading on set detail page
- [x] Add sealed product inventory management UI (add/remove from collection)

### 3.2 Legal & Compliance

- [ ] Review Wizards of the Coast's Fan Content Policy and verify compliance
- [ ] Implement data privacy practices (GDPR/CCPA compliance, privacy policy, data export/deletion)
- [ ] Draft Terms of Service (acceptable use, data attribution, termination conditions)
- [ ] Add cookie consent and privacy controls to UI

### 3.3 Affiliate Integration

- [ ] Sign up for TCGPlayer affiliate program
- [ ] Sign up for Card Kingdom affiliate program
- [ ] Add price display with affiliate links to card detail views (current market prices from both sources)
- [ ] Track affiliate click-through rates (event log for which cards drive purchases)

### 3.4 Freemium Structure & Subscription Billing

- [ ] Define free tier limits (collection tracking, basic transaction logging, card search)
- [ ] Define premium tier features (new features only — do not gate existing shipped features)
  - Advanced analytics (collection value breakdown by set, format, color, rarity)
  - Priority access to new features
  - Extended price history retention
  - Deck building and management
- [ ] Integrate Stripe for subscription billing (monthly $3.99–4.99, annual $35–40)
- [ ] Build subscription management UI (upgrade prompts, plan selection, billing history, cancellation)
- [ ] Implement feature gating in API layer (backend tier checks, not frontend)

### 3.5 Feature: Deck Building

- [ ] Design deck data model (deck table with user FK, deck_card join table with quantity, sideboard flag)
- [ ] Create database migration for deck tables
- [ ] Implement domain entities, repository ports, ORM entities, mappers, and repositories
- [ ] Implement DeckService with CRUD operations (create, update, delete, add/remove cards)
- [ ] Create REST API endpoints for decks (CRUD, add/remove cards, list user decks)
- [ ] Build deck list view page (user's saved decks with name, format, card count, estimated value)
- [ ] Build deck detail view page (card list grouped by type, mana curve visualization, price breakdown)
- [ ] Add "Add to Deck" action from card detail and search results
- [ ] Deck import/export (paste decklist text format, CSV)
- [ ] Format legality validation (check deck against format rules — Standard, Modern, Commander, etc.)

---

## Phase 4: API & Developer Ecosystem

### 4.1 API Monetization & Tiering

- [ ] Define API tiers (Free: 100 req/day read-only; Developer $9.99/mo: 5,000 req/day + webhooks; Business $29.99–49.99/mo: 50,000 req/day + bulk endpoints)
- [ ] Implement API key management (generate, revoke, view usage)
- [ ] Extend rate limiting to enforce per-tier limits with clear error messages and upgrade prompts
- [ ] Integrate Stripe for API subscriptions (separate from consumer subscription, or bundled)
- [ ] Build usage dashboard (request counts, rate limit headroom, historical usage)

### 4.2 Developer Portal

- [ ] Build or host interactive API docs page (Redoc or Stoplight — more polished than raw Swagger UI)
- [ ] Create developer portal section with API key management and usage stats
- [ ] Write "Getting Started" guide and 2–3 integration tutorials (e.g., "Build an MTG Discord price bot")
- [ ] List API on RapidAPI and similar marketplaces as a discovery channel

### 4.3 MCP Server & Agentic AI Integration

- [ ] Publish OpenAPI spec at well-known URL (`/.well-known/openapi.json`)
- [ ] Build and publish MCP server for the API (card data, collection management, transaction endpoints)
- [ ] Create GitHub repository for MCP server with README, examples, and installation instructions
- [ ] Submit MCP server to community directories and awesome-lists
- [ ] Write tutorial: "Building an AI-powered MTG collection assistant with the IWMM API"

---

## Phase 5: Growth & Community

### 5.1 External Import Tools

- [ ] Build Moxfield import integration (collection import — powerful acquisition hook)
- [ ] Build Archidekt import integration
- [ ] Build Deckbox import integration (longest-running tool, most legacy data)
- [ ] Parse common CSV formats (TCGPlayer export, Deckbox export, generic)
- [ ] Highlight import capability in all marketing — eliminating data entry friction is the #1 acquisition driver

### 5.2 Content & SEO Marketing

- [ ] Set up blog section (markdown-rendered or external platform like Dev.to)
- [ ] Write 3–5 cornerstone articles targeting high-intent search queries:
  - "How to track your MTG collection value"
  - "Best way to log MTG card transactions"
  - "MTG collection management for serious collectors"
  - "How to know when to sell your Magic cards"
- [ ] Write "building in public" technical post (NestJS architecture, API-first design, Rust ETL)

### 5.3 Community Engagement

- [ ] Engage authentically in key communities before promoting (r/mtgfinance, r/magicTCG, r/EDH, MTG finance Discord servers)
- [ ] Create dedicated Discord server for app feedback and community
- [ ] Post "Show Reddit" style post on r/mtgfinance when product is polished
- [ ] Reach out to 3–5 MTG content creators (MTG Goldfish, Tolarian Community College, finance-focused YouTubers)

### 5.4 Launch Events

- [ ] Submit to Product Hunt (Tuesday/Wednesday launch with screenshots, demo video, value proposition)
- [ ] Post on Hacker News (Show HN — developer-hobbyist crossover audience)
- [ ] Offer content creators early access + free premium + referral codes

### 5.5 Analytics

- [ ] Set up privacy-respecting analytics (PostHog or Plausible)
- [ ] Track key metrics: DAU/MAU, free-to-premium conversion, affiliate CTR, API adoption, churn
- [ ] Run monthly feedback cycle from Discord community and support requests

---

## Phase 6: Platform Expansion

### 6.1 Mobile App (Cross-Platform)

- [ ] Choose framework (React Native recommended given JS background; Flutter if Dart is appealing)
- [ ] Scaffold mobile app project in new repo
- [ ] Integrate with API layer
- [ ] Implement core views: collection browsing, card search, transaction logging
- [ ] Add camera-based card scanning (Google ML Kit or similar — potential premium-only feature)
- [ ] Market cross-platform sync as core differentiator ("scan on phone, manage on web")
- [ ] TestFlight / internal testing distribution
- [ ] App Store and Play Store submission

### 6.2 Desktop App (Optional)

- [ ] Evaluate whether desktop app adds value beyond existing PWA capabilities (service worker, offline support)
- [ ] If proceeding: choose framework (Tauri recommended — lighter than Electron, wraps existing web frontend)
- [ ] Add desktop-specific features (bulk local file import, keyboard shortcuts, system tray for price alerts)
- [ ] Distribute via direct download and platform stores

### 6.3 Import Inventory by Picture

- [ ] Research card recognition APIs/libraries (Scryfall image matching, ML models)
- [ ] Design image upload and processing flow
- [ ] Implement image capture UI (web + mobile)
- [ ] Implement card identification from image
- [ ] Add review/confirm step before adding to inventory
- [ ] Handle multiple cards in single image
- [ ] Test accuracy and iterate on recognition

---

## Phase 7: Advanced Monetization & Ecosystem

### 7.1 Peer-to-Peer Transaction Facilitation

- [ ] Research legal and compliance requirements (money transmitter regulations — consult a lawyer)
- [ ] Build trade/sale matching system (users list cards to sell/trade, system matches buyers, 3–5% fee)
- [ ] Implement reputation and trust systems (ratings, verified history, dispute resolution)
- [ ] Start small — limit to verified users in same region or LGS, expand geographically as trust matures

### 7.2 LGS (Local Game Store) Tools

- [ ] Build store-facing dashboard for inventory management (track inventory, set prices vs. market data, buylist pricing)
- [ ] Offer "Store" subscription tier ($49–99/month) with POS integration, customer want-lists, event inventory
- [ ] Partner with 5–10 LGS owners as beta testers

### 7.3 Data & Analytics Products

- [ ] Build aggregated market trend reports (weekly/monthly price movements, format staples, set value trends)
- [ ] Explore anonymized data licensing for content creators, store chains, and market analysts (only viable at scale)

### 7.4 Premium Bundling for Multi-Platform

- [ ] Revisit subscription tiers to reflect multi-platform value (one account, everywhere)
- [ ] Consider "Collector Pro" tier ($7.99–9.99/month) bundling premium app + Developer-tier API access

---

## Phase 8: Architecture

### 8.1 Evaluate Removing NestJS Dependency

- [ ] Audit current NestJS features used (DI, guards, pipes, interceptors, etc.)
- [ ] Evaluate lightweight alternatives (Fastify standalone, Express + tsyringe, etc.)
- [ ] Compare dependency tree size (before/after)
- [ ] Decide: migrate or keep NestJS
- [ ] If migrating: plan incremental migration strategy
- [ ] If migrating: execute migration module by module
- [ ] If keeping: document decision and rationale

### 8.2 Scry: Interactive Mode

- [ ] Design interactive CLI menu (select commands, configure options)
- [ ] Add interactive mode entry point (`cargo run -- interactive` or default)
- [ ] Add interactive selection for ingestion targets (sets, cards, prices)
- [ ] Add progress display and confirmation prompts
- [ ] Add dry-run option for destructive operations

# Roadmap

## Phase 1: Foundation & Infrastructure

### 1.1 Migrate DB from Docker to Managed Instance

Done: migrated production from Docker Postgres to AWS Lightsail Managed PostgreSQL 18 via pg_dump/pg_restore, with SSL config, automated backups/PITR, and full removal of in-cluster postgres/vacuum tooling.

### 1.2 Split Scry into Separate Repository

Done: ETL extracted to standalone `scry` repo with its own CI/CD; web app pulls the ETL Docker image from ghcr.io.

### 1.3 Integration Test Suite

Done: Docker-based Postgres test harness (`docker-compose.test.yml`, port 5433) running e2e suites for auth, inventory, transactions, portfolio, and card/set search; wired into CI.

### 1.4 Create API Layer

Done: versioned `/api/v1/` REST API with JWT bearer + cookie auth, full CRUD across cards/sets/inventory/transactions/portfolio/user, OpenAPI docs at `/api/docs`, `ApiResponseDto` envelope, `ApiRateLimitGuard`, and integration tests.

### 1.5 Progressive Web Enhancement

Done: AJAX paginate/sort/filter across set list, card search, set-card list, inventory, and transactions — all backed by `/api/v1/*` with URL state, scroll preservation, and toast notifications on errors.

### 1.6 Frontend Consolidation

Done: shared `ajaxUtils` (renderTags, stepperGroup, template cloning), extracted `emptyState.hbs` and `statCard.hbs` partials, standardized headings/tables/wrappers/script-defer, dynamic price/foil columns, consistent Normal→Foil ordering, and `concat` HBS helper.

### 2.1 Add Pre-fetching for Performance

Done: resource hints (dns-prefetch, preload), Express static cache headers + cache-busting, `CacheControlInterceptor` for API responses, idle/hover link prefetch with `Save-Data` respect, service worker with offline fallback and versioned caches.

### 2.2 Lighthouse Performance Optimization

Done: deferred non-critical CSS/JS (FA solid-only, async Google Fonts, mana-font), lazy + sized images with WebP logo/bg, Tailwind path fix + `--minify`, dynamic `<title>`/`<meta description>`, accessibility ARIA/contrast/heading fixes, favicon, CloudFront HTML compression. All pages 95+ on Lighthouse mobile/desktop.

### 2.3 Standardize Card Links

Done: reusable `cardLink.hbs` partial + `renderCardLink()` JS for AJAX, single floating hover/long-press preview element via globally-loaded `cardPreview.js`, respects `prefers-reduced-motion`.

### 2.4 Card Image Interactivity & Resolution

Done: Scryfall normal/large images, hover-zoom on desktop, tap-to-enlarge modal on mobile, subtle fade/lift animations gated on `prefers-reduced-motion`, refreshed card-detail layout.

### 2.5 Accessibility Optimization

Done: ARIA labels, heading hierarchy, color contrast fixes, full keyboard nav (card preview, modal focus trap, mobile menu), skip-link, focus-visible outlines, ARIA live regions for AJAX content swaps.

### 2.6 SEO

Done: dynamic meta + OG tags, JSON-LD Product + BreadcrumbList on card pages, sitemap index with per-set sitemaps, robots.txt, canonical URLs site-wide, Google Search Console submission.

### 2.7 Feature: Binder View

Done: page-like binder grid for set + inventory with list/binder toggle, arrow-key nav, owned-only filter, in-binder quantity stepper, scroll-position preservation, localStorage view preference.

### 2.8 Feature: Bulk Upload Transactions

Done: CSV import for transactions with shared `CardImportResolver`, per-row validation/error reporting, error-CSV download, reuses `TransactionService.create()` and `importResult` template; UI surfaced on transactions page.

### 2.9 Improve Site Copy and UX Guidance

Done: getting-started guide at `/guides/getting-started`, first-visit hints (binder, portfolio metrics, import), navbar Help icon, refreshed welcome banner and home hero, fluid `clamp()` typography, page-by-page copy polish including error pages.

### 2.10 Restructure Set Blocking UI for Set Lists

Done: block-level pagination via `SetService.findBlockGroupKeys`, `SetBlockGroup` DTO + `BlockPaginationMeta`, mirrored client-side grouping in `setListAjax`, indented block-child rows on desktop and mobile.

### 2.11 Support Flavor Name

Done: `flavor_name` column (migration 023), Scry ingestion, full ORM/domain/mapper/DTO plumbing, displayed on card detail and included in card search.

### 2.12 Feature: Price Notifications

Done: `price_alert` + `price_notification` data model (migrations 025/026), service CRUD + idempotent detection, batched HTML emails, cron-triggered daily processing (with detection-query fix for Scry's MTGJSON date-lag), `/price-alerts` management page, card-detail alert form, `/notifications` history. Hardened with typed domain errors, HTML-escape utility, shared `buildCardUrl`, CHECK constraint on threshold presence.

### 2.13 UI Polish

Done: active price alert badge on card detail; normal/foil price info in binder card-hover overlay.

### 2.14 Site-wide Visual Refresh

The Claude-generated `/pricing` page (`Pricing Page.html`) introduced a refined visual direction (midnight/teal/purple gradient palette, Space Grotesk typography, gradient-bordered navbar with drawer menu, footer color bar). The pricing page ships with this design page-scoped only; this section rolls it out site-wide and is the next major UX initiative. (Promoted from former §8.2.)

#### Foundations

- [x] Audit current site chrome (navbar, drawer, footer) against the pricing page's chrome — document deltas (`docs/visual-refresh-audit.md`)
- [x] Per-page audit (hero/header, surfaces, tables, buttons) appended to `docs/visual-refresh-audit.md`
- [x] Decide on font: Space Grotesk for body site-wide (`tailwind.config.js` font-body); already loaded in `main.hbs`, no extra payload
- [x] Promote color tokens: added `amber` palette to Tailwind config; normalized white CSS-var fallbacks in `tailwind.css` to `theme('colors.white')`. Two intentional one-offs remain: `#3ab5e0` (pricing CTA gradient mid-stop, no Tailwind equivalent) and `#1a1a1a` (warning toast text contrast)
- [x] Tighten typography rhythm: `.page-title` and `.card-title` clamps bumped to 1.5-2rem, added `letter-spacing: -0.02em`, `line-height: 1.2`, `text-wrap: balance`; `.section-title` gains font-display
- [x] Lift surface treatment site-wide: `rounded-lg` → `rounded-xl`, `dark:bg-midnight-800` → `dark:bg-midnight-900`, `dark:border-midnight-600` → `dark:border-midnight-700` on `.section-container`, `.stat-card`, `.action-card`, `.welcome-banner`, `.table-wrapper`, all auth/settings/verification containers
- [x] Mobile navbar overflow fix: hide Sign In / Sign Up below 600px (drawer-only), hide Upgrade CTA below 380px, reduce inner padding 1.25rem → 0.75rem at narrow widths

#### Chrome

- [x] Replace `main.hbs` navbar with the design's gradient-bordered navbar + drawer menu pattern (#473)
- [x] Replace footer with the design's color-bar + tri-column treatment (#473)

#### Pages and components

- [x] Audit every existing page for visual reconciliation (hero treatments, card surfaces, table styles, button styles) — appended to `docs/visual-refresh-audit.md`
- [x] Align hero/header treatments on key pages (home, portfolio, inventory, set, card detail) with pricing page's depth and gradient accents
    - [x] Home hero (#471)
    - [x] Portfolio + inventory headers and stat tiles (#472)
    - [x] Set + card detail — already covered by `.app-page-header` (set, post-#472) and `.card-info` + `.card-info-bg` (card, post-#476); audit doc updated to reflect current state
- [x] Refresh button styles site-wide to match pricing page's primary/secondary CTA language (#477) — `.btn-cta` aligned to `.pricing-btn-cta` (teal→sky-blue gradient, matching glow); `.btn-upgrade` retired and folded into `.btn-cta`
- [x] Refine card surfaces (tiles, stat cards, panels) toward pricing page's elevation, border, and radius treatment — class-level via foundations (`rounded-xl`, `midnight-900`); inline cleanups (#477) for billingSuccess, portfolioBreakdown teasers, gettingStarted, spoilers, set price popover, upgradeTile
- [x] Reconcile color usage (accents, gradients, muted text) with the pricing page palette across all views — flipped 19 inverted muted-text pairs (`text-gray-400 dark:text-gray-500` → `text-gray-500 dark:text-gray-400`) across set, portfolio, inventory, card, transactions, sealed-product-detail, layouts/main, emptyState, costBasisTooltip, pagination — fixes dark-mode contrast on midnight-900 surfaces. Marketing gradients (billingSuccess, upgradeTile, portfolioBreakdown star icon) and accent stripes (set price popover info, user danger zone) kept as intentional uses.
- [x] Quick-add (+) affordance on card tiles in search results — hover/focus-revealed `+` overlay button posts to `/inventory` (cookie-auth, matches existing stepper pattern) with toast confirmation; click-through to detail page preserved. Set page list, set page binder, and inventory binder already have full +/- steppers via `invStepper.hbs` / `AjaxUtils.createStepperGroup`, which subsume the quick-add affordance, so no parallel button was added there.

#### Verification

- [ ] Re-run Lighthouse performance and accessibility audits after rollout (color contrast in particular)
- [ ] Verify dark/light mode toggle works site-wide (design ships dark-default with light support)

### 2.15 `in_main` Classifier Refactor + User Set-Type Filter

Cross-repo refactor (scry + iwmm) fixing two long-standing classification issues: card-level `in_main` was `0` for newly-released sets (MTGJSON `boosterTypes` lag), and set-level `is_main` couldn't distinguish bonus-sheet sets (BIG, TSB, MAT) from legitimate block-child expansions (Dark Ascension, Eldritch Moon, …). Adds user opt-in for showing additional set types.

- [x] **Phase 1 — card classifier fallback (scry `5.10.0`).** When MTGJSON's `boosterTypes` is absent, fall back to intrinsic per-card signals (`borderColor`, `frameEffects`, `availability`) gated to booster-bearing set types. Fixes SOS / TMT / MSH / BIG card counts without polluting commander products.
- [x] **Phase 2 — order-independent set-level rule (scry `5.11.0`).** New rule: `type IN ('expansion','core') AND code NOT IN BONUS_EXPANSION_OVERRIDES`. Override list (`big`, `mat`, `tsb`) is the authoritative source. Block-children stay `is_main=true`. Tests cover the rule and order-independence as a regression guard.
- [x] **Phase 3 — user set-type preference (iwmm).** `users.included_set_types text[]` (migration `033`); `GET`/`PUT /api/v1/user/preferences/set-types`; "Set Types To Show" section on `/user` with 8 primary types visible and 12 advanced types behind a disclosure. `NULL` falls back to `is_main` so anonymous + existing users see no change.
- [x] Open follow-up: decide whether `type = draft_innovation` sets (Modern Horizons 1–3) belong in the default `is_main` filter. Currently excluded; users can opt in via the Phase 3 preference. They are full-size draftable expansions in everything but MTGJSON's type label.

Detail: [`docs/analysis/in-main-classifier/`](docs/analysis/in-main-classifier/).

---

## Phase 3: Monetization Foundation & New Features

### 3.1 Sealed Product Support

Done: end-to-end sealed product support — schema (migrations 027/028), domain entities + service + repository, REST API (per-set list, detail, sealed inventory CRUD), view layer (`/sealed-products/:uuid` + set-page partial), AJAX loading and inventory UI, Scry ingestion (sealed products, MTGJSON contents flatten, TCGPlayer URLs/prices, card purchase URLs).

### 3.2 Legal & Compliance

Done: WotC Fan Content Policy compliance + footer disclaimer, `/privacy` and `/terms` pages linked from footer/sitemap, `legal@iwantmymtg.net` alias, `GET /api/v1/user/export` JSON download, verified `ON DELETE CASCADE` on all user FKs for deletion scrub.

### 3.3 Affiliate Integration

Done: TCGPlayer Impact affiliate partner signup; `AffiliateLinkPolicy` wraps product URLs on card detail and sealed product views (raw product IDs come from Scry/MTGJSON).

### 3.4 Freemium Structure & Subscription Billing

Done: Stripe subscription billing (customer, Checkout, Billing Portal, webhooks); `SubscriptionGuard` + `@RequiresSubscription()` decorator; `subscribed` propagated through `BaseViewDto`; `/pricing` page + navbar/footer links; advanced analytics flagship at `/portfolio/breakdown?by=set|rarity|type|format|costBasis` with server-side gating; all gating wired across transactions (30-day cutoff), portfolio history/P&L/cash-flow tiles, sealed inventory, set completion, price-history range, alert count/multi-threshold; reusable `upgradeTile.hbs`; AJAX `handleGatedResponse` helper; `/billing/success` celebration view; navbar Premium/Upgrade affordance; one-time welcome banner on signup.

Pricing model below kept as a reference (free vs premium feature split).

#### Freemium model (depth gating, no creation caps)

Competitor benchmarks (April 2026): Dragon Shield $2.99/mo with hard 100-card cap (widely criticized), ManaBox $2.49/mo gating decks not inventory, Deckbox $3.99/mo with QoL-only premium, Moxfield/Archidekt mostly free. Hard caps convert poorly and damage word-of-mouth. IWMM positions closer to Moxfield/Deckbox: free tier is fully usable forever; premium unlocks depth (analytics, history, external integrations, scanning) - the things serious collectors care about.

**Pricing change:** drop from $3.99/mo, $49/yr to **$3.99/mo, $39.99/yr** (matches Deckbox annual; annual saves ~2 months vs monthly). No existing paid subs as of the change, so no Stripe migration needed - update Stripe Prices and `STRIPE_PRICE_*` env vars.

**Free tier (no creation limits, fully usable forever):**

- Browse all sets and cards
- Track inventory: unlimited cards
- Track transactions: unlimited (last 30 days visible in history view; older data preserved server-side)
- Price alerts: up to 5, single threshold direction per alert
- Live market prices
- Price history charts: 30 days
- Basic portfolio overview (current value)
- CSV import and export, including external imports from Moxfield, Archidekt, Deckbox, and TCGPlayer (auto-detected)
- Binder view
- Standard support
- API: 100 requests/day

**Premium ($3.99/mo, $39.99/yr):**

- Everything in Free, plus:
- Unlimited price alerts
- Multi-threshold alerts (increase AND decrease per card)
- Full transaction history (no 30-day view cutoff)
- Portfolio value history and charts
- P&L tracking
- Cash flow charts
- Set completion tracking
- Sealed product tracking
- Set price history
- Advanced analytics (collection value breakdown by set, format, color, rarity) - to build
- Card image scanning - ships in Phase 6.3
- Priority support
- Early access to new features

External imports moved to Free (April 2026, Phase 5.1) — gating acquisition behind a paywall while three direct competitors (Moxfield, Archidekt, Deckbox) let users import for free traded too much top-of-funnel for too little conversion. The Premium pull is the financial analysis (P&L, portfolio history, cost basis, advanced analytics) that only matters after the user has data in the system — imports are the funnel into those features, not a feature in themselves.

API rate limits remain 100/day for free and premium alike - all API monetization is deferred to Phase 4.1's separate Developer/Business tiers.

**Conversion model implication:** with no creation caps, conversion depends on users _wanting_ depth features. Zero retroactive disruption to existing users (nothing taken away), zero churn risk, no grandfathering required. The load-bearing premium pitches are the financial-analysis features (portfolio history, P&L, cost basis, advanced analytics — all shipped) and card image scanning (Phase 6.3). External imports are the acquisition funnel into those features, not a conversion lever.

---

## Phase 4: API & Developer Ecosystem

### 4.1 API Monetization & Tiering

API tiering is a **separate subscription model** from the consumer Premium tier — different Stripe Prices, different lifecycle, tracked in `api_subscription` (not `subscription`). Limits apply **per-user, not per-key**, so a user can't game the quota by creating multiple keys. Counter store is Postgres (no new infra; current scale doesn't justify Redis).

#### Schema & data model

- [x] Migration 032: `api_subscription` (separate Stripe sub), `api_key` (max 1 active per user, sha256-hashed), `api_usage` (per-user daily counters)
- [x] Update complete schema file (001_complete_schema.sql)

#### Tier definitions

- [x] Tier limits constant (Free: 100 req/day, 60/min burst; Developer $9.99/mo: 5,000/day, 300/min; Business $29.99/mo: 50,000/day, 1,000/min + bulk endpoints/webhooks)

#### Auth & rate limiting

- [x] `ApiKeyAuthGuard` — accepts `Authorization: Bearer iwm_live_...` or `X-API-Key` header; resolves user via `sha256(rawKey)` lookup; updates `last_used_at`
- [x] Extend `ApiRateLimitGuard` to (a) read tier from `api_subscription` for the resolved user, (b) UPSERT `api_usage(user_id, day)` and reject on overage with `429`, (c) keep per-minute burst protection in-memory
- [x] Cookie-JWT browser traffic: keeps per-minute burst only; does NOT count toward daily quota
- [x] Error responses include `X-RateLimit-Limit/Remaining/Reset` headers and an upgrade-prompt message linking to `/developer/pricing` (omitted at Business tier)

#### API key management

- [x] `ApiKeyService` — generate (32 url-safe random + `iwm_live_` prefix; raw shown once), revoke, list; enforces one-active-key-per-user
- [x] REST endpoints: `POST /api/v1/api-keys`, `GET /api/v1/api-keys`, `DELETE /api/v1/api-keys/:id` (JWT-auth, not API-key-auth — chicken/egg)
- [x] Settings page UI at `/user/api-keys`: create / view (prefix only after creation) / revoke

#### Stripe integration (API tier)

- [x] Stripe gateway extended with `priceIdForApiTier`/`apiTierForPriceId`/`createCheckoutSessionForPrice`; env vars `STRIPE_PRICE_API_DEVELOPER`, `STRIPE_PRICE_API_BUSINESS`
- [x] `ApiSubscriptionService` provides full Stripe lifecycle (checkout, portal, webhook sync); reuses one Stripe Customer per user across consumer + API subscriptions
- [x] Webhook handler routes `customer.subscription.{created,updated,deleted}` events to either consumer `SubscriptionService` or `ApiSubscriptionService` by inspecting the price id
- [x] `/developer/pricing` page with tier comparison and checkout buttons; `/developer/billing/{checkout,portal,success}` flow

**Stripe-side work still required (manual, not code):** create new Products + Prices for "API Developer" ($9.99/mo) and "API Business" ($29.99/mo), set `STRIPE_PRICE_API_*` env vars in dev and prod.

#### Usage dashboard

- [x] `GET /api/v1/api-keys/usage` — current tier, perDay/perMinute limits, today's count, headroom, last-30-day history
- [x] Today's usage tile + 30-day bar chart on `/user/api-keys`

#### Follow-ups (deferred)

- [ ] **Retention sweeper for `api_usage`** — delete rows where `day < CURRENT_DATE - 90` (cron, runs daily). Not implemented at launch since the table grows ~1 row/active-user/day; revisit when row count crosses ~1M.

### 4.2 Developer Portal

Decision (2026-05-05): API key management and usage stats already shipped in 4.1 at `/user/api-keys` (create/revoke key, today's usage tile, 30-day bar chart). Left the canonical route there since it's account-scoped state (parallel to `/billing`); the developer portal links to it rather than duplicate or move it. `/developer/pricing` already existed from 4.1; the new `/developer` hub sits alongside it.

- [x] API key management UI — shipped in 4.1 at `/user/api-keys`
- [x] Usage stats (today + 30-day chart) — shipped in 4.1 at `/user/api-keys`
- [x] Interactive API docs page at `/developer/docs` — Redoc loading `/api/openapi.json`. OpenAPI spec generation moved out of the non-prod-only branch in `main.ts` and exposed at `/api/openapi.json` in all envs (Swagger UI at `/api/docs` still non-prod only). Spec response is `Cache-Control: public, max-age=3600`.
- [x] `/developer` portal landing — hub page linking docs, pricing, the three guides below, and "Manage API Keys" → `/user/api-keys`. Footer "Developer API" link repointed from `/developer/pricing` to `/developer`.
- [x] Getting Started guide (`/developer/guides/getting-started`) — key creation, Bearer auth, first request, rate-limit headers
- [x] Tutorial: Discord price bot (`/developer/guides/discord-bot`) — discord.js slash command + IWMM card lookup
- [x] Tutorial: Portfolio CSV export (`/developer/guides/portfolio-export`) — Python stdlib walk of `/inventory` paginated + portfolio snapshot to CSV
- [x] Sitemap updated to include `/developer*` URLs
- [x] List API on RapidAPI — listing live at https://rapidapi.com/matthewdtowles/api/i-want-my-mtg. Adjacent marketplaces (APIs.guru, Postman, public-apis) deferred per `docs/rapidapi-listing-checklist.md`.

#### RapidAPI listing — engineering prereqs (shipped)

- [x] `RapidApiProxyGuard` (`src/http/api/shared/rapidapi-proxy.guard.ts`) — validates `X-RapidAPI-Proxy-Secret` against `RAPIDAPI_PROXY_SECRET` with `timingSafeEqual`. Stamps `request.rapidApi = { user }` on success; throws on bad secret (no silent downgrade); returns false (not throws) when header is absent so it can be composed.
- [x] `OptionalAuthOrApiKeyGuard` calls `RapidApiProxyGuard.tryAuthenticate()` first; RapidAPI traffic gets through anonymous on read endpoints. Auth-required endpoints (`JwtOrApiKeyGuard`) are unchanged — they still require an IWMM key/JWT, so RapidAPI traffic cannot reach inventory/portfolio/transactions/alerts.
- [x] `ApiRateLimitGuard` skips per-user daily quota for `request.rapidApi`; applies a coarse origin-wide burst cap (`RAPIDAPI_BURST_PER_MIN = 600`) under a single `__rapidapi__` bucket. No `X-RateLimit-*` headers on those responses (would mislead the marketplace consumer).
- [x] Public OpenAPI spec at `/api/openapi-public.json` — `buildPublicSpec()` in `main.ts` filters to `/api/v1/cards`, `/api/v1/sets`, `/api/v1/sealed-products` GETs only; strips Bearer security scheme; rewrites `info.title`/`description` for marketplace consumers. Cache-Control: `public, max-age=3600`.
- [x] `RAPIDAPI_PROXY_SECRET` added to `.env.example`. Not in `REQUIRED_PROD_ENV` — leaving unset disables RapidAPI access entirely (the guard rejects with 401 if a request arrives bearing the proxy header but no secret is configured).

#### RapidAPI listing — remaining manual work (when ready to go live)

- [x] Sign up at https://rapidapi.com/provider, complete provider profile
- [x] Create API in RapidAPI Studio; upload OpenAPI spec via Definitions → CI/CD (URL-based auto-sync isn't available on personal/free provider accounts — manual file re-upload after meaningful spec changes; workflow in `docs/rapidapi-listing-checklist.md`)
- [x] Upload logo
- [x] Copy auto-generated `X-RapidAPI-Proxy-Secret` from Studio → Gateway → Firewall Settings; add as `RAPIDAPI_PROXY_SECRET` in prod env via deploy pipeline (RapidAPI generates the value, not us)
- [x] Confirm/set base URL to `https://iwantmymtg.net` (General tab — likely auto-set from spec's `servers:` field on import)
- [x] Set Gateway proxy timeout to ~30s; leave Threat Protection and Request Schema Validation off (NestJS guards + class-validator already cover these)
- [x] Configure pricing tiers in Monetize tab to match `/developer/pricing` (Free $0/100 per day, Developer $9.99/mo/5k per day, Business $29.99/mo/50k per day) — consider ~25% markup to offset RapidAPI's ~20% revenue share if revenue parity with direct Stripe subscribers matters
- [x] Write public description, set support email (General tab)
- [x] Add API Overview documentation on the RapidAPI listing (overview, what-you-can-build, endpoints summary, rate limits, write-access pointer all present)
- [x] Polish endpoint `operationId`s — sidebar currently shows auto-generated `CardApiController_*` names; add explicit `operationId` to each `@ApiOperation({...})` in API controllers and re-upload spec
- [x] Complete payout details (PayPal — RapidAPI's only provider payout option) so paid-tier subscriptions can pay out
- [ ] Run RapidAPI's "Test Endpoint" flow on each endpoint, fix anything that returns unexpected shapes
- [x] Merge `api-dashboard` to main and deploy so `https://iwantmymtg.net/api/openapi-public.json` is live (URL-based auto-sync N/A on this provider tier — file re-upload only)
- [x] Toggle listing public, submit for review (listing is live and discoverable in the Hub)
- [x] Post-listing: "Available on RapidAPI" badge added to `/developer` hub (`developer.hbs`)
- [ ] Adjacent free marketplaces (do once RapidAPI is stable): APIs.guru, Postman API Network, Public APIs GitHub repo

#### Public API surface improvements (single PR — Phase 1 + Phase 2)

Audit found UUID-keyed endpoints leaking into the public spec (`/cards/{cardId}/*`, `/sealed-products/{uuid}*`) — internal identifiers a marketplace consumer can't usefully obtain. Sealed product UI also displays prices that are effectively never populated; we don't have real sealed pricing and won't (TCGPlayer affiliate link is the path for sealed buy-intent). Card search is name-substring only; subscribers can't filter by rarity, type, set, or format legality, which limits the use cases the listing's marketing copy promises.

Design constraints: external identifiers are **names, set codes, and card numbers within sets** — never UUIDs. No bulk price lookup (would collapse 50 calls into 1, eroding monetization). Per-set prices are already covered by `GET /sets/{code}/cards`. Sealed kept deliberately simple: list-per-set only, no detail endpoint, no name-based lookup, no prices anywhere.

Phase 1 — spec hygiene + sealed price removal:

- [x] Tighten `buildPublicSpec()` (`src/http/api/openapi-public-spec.ts`) to an explicit path allowlist: `GET /api/v1/cards`, `/cards/{setCode}/{setNumber}` + `/prices` + `/price-history`, `/sets`, `/sets/{code}` + `/cards` + `/price-history` + `/sealed-products`. Drop `/cards/{cardId}/*` and `/sealed-products/{uuid}*` from the public spec (controllers stay; internal UI keeps using them)
- [x] Add unit test asserting the public spec's path set matches the allowlist exactly — guards against future controllers leaking
- [x] Strip `price`, `priceChangeWeekly` from `SealedProductApiPresenter` + `SealedProductApiResponseDto`
- [x] Strip `price`, `priceRaw`, `hasPrice`, `priceChangeWeekly`, `priceChangeWeeklySign` from `SealedProductRowDto` + `src/http/hbs/sealed-product/sealed-product.presenter.ts`
- [x] Remove price tile + Price History section from `src/http/views/sealed-product-detail.hbs`
- [x] Remove Price column from `src/http/views/partials/sealed-list.hbs`
- [x] Delete orphaned `src/http/public/js/sealedPriceHistoryChart.js`
- [x] Delete `GET /sealed-products/{uuid}/price-history` controller endpoint and its service method (no callers after view changes)
- [x] DB column `sealed_product.price` left intact (non-destructive; Scry can keep populating without effect)

Phase 2 — filterable card search:

- [x] Add query params to `GET /api/v1/cards`: `setCode`, `rarity` (common|uncommon|rare|mythic), `type` (substring), `format` (joins `legality` table), `legality` (defaults to `legal` when `format` set)
- [x] Add same params to `GET /api/v1/sets/{code}/cards`
- [x] Extend `SafeQueryOptions` to parse + validate the new params (reject unknown values for `rarity`/`legality`)
- [x] Repository: build dynamic WHERE in `CardRepository.searchByName` / `findBySet` for the new filters; reuse existing `legality` join shape
- [x] Tests-first: integration tests per filter alone, two filters combined, and `format` + non-default `legality` value
- [x] Add explicit `operationId`s on any new `@ApiOperation` decorators

Post-PR (manual, not code):

- [x] Re-fetch `https://iwantmymtg.net/api/openapi-public.json` after deploy and re-upload to RapidAPI Studio (Definitions → CI/CD → Import OpenAPI)
- [x] Verify in Studio sidebar: no `*Controller_*` operation names, no UUID-shaped paths, no sealed price-history endpoint

Phase 3 (deferred — blocked):

- [ ] Color filtering (`?color=`, `?colorIdentity=`) — blocked on Scry populating `card.colors` from MTGJSON `colorIdentity` (already tracked elsewhere in roadmap)

### 4.3 MCP Server & Agentic AI Integration

Goal: ship an MCP server so Claude Desktop / Claude Code / Cursor / other MCP clients can query IWMM card data and manage a user's collection conversationally. Builds on 4.1 (API keys, tiered rate limits) and 4.2 (OpenAPI spec, developer portal). Auth reuses existing `iwm_live_...` API keys — no new identity surface.

Server lives in a separate repo at [`iwantmymtg-mcp`](https://github.com/matthewdtowles/iwantmymtg-mcp).

**Done:**
- MCP server scaffolded (`@modelcontextprotocol/sdk`, stdio, Node 20+) with full tool surface: read-only card/set/sealed-product tools (public endpoints) and authenticated inventory/transaction/portfolio/price-alert/notification tools (gated on `IWMM_API_KEY`).
- Tool inputs documented via zod `.describe()`; `ApiError` surfaces rate-limit headers; `formatApiError` returns clean upgrade/auth/reset prompts for 401/402/403/429; `IWMM_BASE_URL` env var for self-hosters.
- 45 unit tests on `node:test` covering `apiFetch` + one happy-path per tool.
- Web app prereqs: `/.well-known/openapi.json` + `openapi-public.json` redirects; `/developer/guides/mcp-server` guide + hub card; "Use with Claude (MCP)" section on `/user/api-keys`; sitemap entry.
- Distribution: README with Claude Desktop / Claude Code / Cursor config snippets; published to npm as `iwantmymtg-mcp` v0.1.0 via Trusted Publishing/OIDC; `examples/` dir with prompt walkthroughs; CI on push/PR + publish-on-tag workflow.

#### Typed API client (server repo)

Done: the MCP server now talks to the IWMM API through a typed `openapi-fetch` client generated from the OpenAPI spec.

- [x] Added `openapi-typescript` (dev) + `openapi-fetch` (runtime) deps in `iwantmymtg-mcp`
- [x] `build:types` script fetches `/api/openapi.json` (configurable via `IWMM_OPENAPI_URL`, default prod) and emits `src/generated/api-types.ts`
- [x] `build:types` wired into `prebuild` and CI so generated types are always fresh
- [x] All tools migrated from the untyped `apiFetch` shim to `apiClient` against the generated `paths` types; shim removed. Typed paths caught a latent bug — `update_transaction` was sending `PATCH` to an endpoint the spec declares as `PUT`.
- [x] zod input schemas kept at the tool boundary for LLM-facing descriptions (as planned); type safety against the generated spec now comes from the `apiClient` call sites at compile time.
- [x] Regeneration + breaking-change workflow documented in `CONTRIBUTING.md`

#### Remaining: Discovery

All five items are manual. Do the demo GIF (under Content, below) first so the Reddit posts and listings can reuse it. Suggested order: GIF, then `modelcontextprotocol/servers` PR, then Glama + Smithery, then Reddit.

**PR to [`modelcontextprotocol/servers`](https://github.com/modelcontextprotocol/servers)** - the canonical community index; getting listed here is what most other directories crawl.

- [ ] Read `README.md` and `CONTRIBUTING.md` in that repo first. Community servers live in `README.md` under a "Community Servers" (or "Third-Party Servers") heading; confirm the exact current heading and entry format before editing.
- [ ] Fork the repo, branch, add one entry in the community list. Entries are alphabetical by name. Match the existing line format exactly, roughly: `- **[I Want My MTG](https://github.com/matthewdtowles/iwantmymtg-mcp)** - Query Magic: The Gathering cards and prices and manage your collection.`
- [ ] Keep the description to one line, factual, no marketing language (their reviewers reject hype).
- [ ] Open the PR using their PR template; check the boxes it asks for (license present, server works, etc.). Expect a slow review and possibly a request to consolidate. Respond promptly.

**[Glama](https://glama.ai/mcp/servers)** - auto-crawls GitHub for MCP servers and scores them on quality.

- [ ] Search glama.ai for "iwantmymtg" or "I Want My MTG". It likely auto-indexed already once the repo was public.
- [ ] If listed: sign in with GitHub and claim the server so you can edit its metadata.
- [ ] If not listed: use the "Add server" / submit flow with the repo URL.
- [ ] Glama's quality score rewards a clear README, an OSI license (MIT is present), example usage, and CI. The repo already has these; just confirm the score looks reasonable after indexing.

**[Smithery](https://smithery.ai)** - MCP server registry and (optionally) host.

- [ ] Sign in with GitHub. Use "Add Server" / "Deploy" and point it at the `iwantmymtg-mcp` repo.
- [ ] Smithery expects a `smithery.yaml` in the repo root describing how to launch the server. For this stdio server it declares the run command (`npx iwantmymtg-mcp`) and a config schema with one optional field, `IWMM_API_KEY`. Add that file as part of this task and confirm the current schema against Smithery's docs before committing.
- [ ] Verify the listing renders the tool list and the README, then mark it public.

**Reddit launch posts** - post the GIF natively (Reddit deprioritizes link posts). Read each subreddit's rules and self-promotion policy first; both restrict it.

- [ ] r/ClaudeAI - developer/AI framing. Title like "I built an MCP server that lets Claude manage my Magic: The Gathering collection". Body: what MCP is in one sentence, the demo GIF, 3-4 example prompts ("what's my portfolio worth", "add 4x Lightning Bolt from LEA", "alert me if any card drops 20%"), install snippet, repo link. Engage with comments for the first few hours.
- [ ] r/mtgfinance - collector framing, not developer. Lead with the outcome ("track your collection value and get price alerts by just talking to Claude"), not the technology. Same GIF. Mention it is free and open source, link the repo and the `/developer/guides/mcp-server` page. Avoid jargon like "MCP server" in the title; say "Claude integration".
- [ ] Optional follow-ups once the above land well: r/magicTCG (rules vary, check before posting) and the MTG finance Discord servers.

#### Remaining: Content

**Tutorial blog post** - "Building an AI-powered MTG collection assistant with the IWMM MCP server".

- [ ] Decide location. There is no `/blog` yet (Phase 5.2 builds it), so publish under the existing developer guides as `/developer/guides/mcp-tutorial` rather than blocking on blog infrastructure. Move it to `/blog` later if 5.2 ships.
- [ ] Outline: (1) what the MCP server does in two sentences, (2) prerequisites - an IWMM account and an API key from `/user/api-keys`, (3) install and Claude Desktop config (copy the snippet from the `iwantmymtg-mcp` README so the two stay in sync), (4) a real walkthrough conversation, (5) link to the repo and the npm package.
- [ ] For the walkthrough, run an actual Claude Desktop session and paste the real exchange: search for a card, add it to inventory, check portfolio value, create a price alert. Use the same conversation you record for the GIF so the post and GIF match.
- [ ] Add the page to the sitemap and link it from the `/developer` hub card next to the existing MCP guide.

**Demo GIF** - one short GIF showing a full Claude Desktop conversation, reused in the README, both Reddit posts, and the blog post.

- [ ] Script the conversation before recording: 3-4 prompts that show both read and write tools (card lookup, add to inventory, portfolio value, price alert). Keep it under ~30 seconds.
- [ ] Record the Claude Desktop window. On macOS, Cmd+Shift+5 records a region; or use a tool like Kap which exports GIF directly.
- [ ] Convert to GIF if needed. `gifski` gives the best quality-per-byte: record to mp4, then `gifski --width 1200 --fps 12 -o demo.gif demo.mp4`. Keep the file under ~10 MB so GitHub renders it inline; trim length or drop fps/width if it is larger.
- [ ] Add it near the top of the `iwantmymtg-mcp` README, above or just below the install section.

**Optional screen-recorded video** - a sub-2-minute narrated walkthrough.

- [ ] Only worth doing if the GIF and posts get traction. Same conversation as the GIF, with voiceover explaining each step.
- [ ] Host on YouTube (unlisted or public), embed the link in the README and the blog post.

#### Deferred (post-launch follow-ups)

- [ ] Remote MCP transport (Streamable HTTP) hosted at `mcp.iwantmymtg.net` — eliminates the install step but requires OAuth flow design; revisit once stdio version has traction
- [ ] MCP resources (vs tools) for browsing card/set data as readable URIs (`iwmm://cards/...`) — nice-to-have, not load-bearing for v1
- [ ] MCP prompts for common workflows ("audit my collection", "find arbitrage opportunities") — value depends on observed usage patterns

---

## Phase 5: Growth & Community

### 5.1 External Import Tools

Done: Moxfield, Archidekt, Deckbox, and TCGPlayer (app + seller) CSV exports are auto-detected on the existing `/inventory/import/cards` upload. All map onto the shared `CardImportRow` pipeline via `src/core/import/parsers/`; etched and (Moxfield-only) glossy finishes import as foil. Deckbox / TCGPlayer-seller use set names (resolved via `CardImportResolver` → `SetRepository.findByExactName`); Moxfield / TCGPlayer-app / Archidekt use set codes. Shipped on the Free tier (see §3.4 rationale).

- [x] Build Moxfield import integration (collection import — powerful acquisition hook)
- [x] Build Archidekt import integration
- [x] Build Deckbox import integration (longest-running tool, most legacy data)
- [x] Parse common CSV formats (TCGPlayer app export, TCGPlayer seller export, Deckbox export, native IWMM)
- [x] Highlight import capability in app copy — inventory empty-state, getting-started guide, import/export guide, and pricing page now mention the four supported sources
- [ ] Refactor follow-up: extract a JSON-API import/export endpoint (`POST /api/v1/inventory/import/cards` multipart + `GET /api/v1/inventory/export`) for API consumers and MCP, reusing the existing parsers and services (deferred from the 5.1 PR audit)

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

### 8.2 Portfolio Breakdown: by=color Dimension

Deferred from 3.4. Blocked on Scry repo: needs `card.colors` populated from MTGJSON `colorIdentity` first. Once that lands, add a `color` case to `PortfolioBreakdownRepository.dimensionConfig()` and a tab on `portfolioBreakdown.hbs`.

- [ ] Scry: ingest `card.colors` from MTGJSON `colorIdentity` into the `card` table
- [ ] Add `color` case to `BreakdownDimension` and `dimensionConfig()`
- [ ] Add "By Color" tab to `portfolioBreakdown.hbs`

### 8.3 Scry: Interactive Mode

Done (separate repo): interactive CLI menu via `cargo run -- interactive`, ingestion-target selection (sets/cards/prices), progress + confirmation prompts, dry-run option for destructive ops.

### 8.4 Feature: Deck Building

Deferred from former §3.5. Not on the near-term roadmap; revisit after monetization, platform expansion, and ecosystem phases land.

- [ ] Design deck data model (deck table with user FK, deck_card join table with quantity, sideboard flag)
- [ ] Create database migration for deck tables
- [ ] Implement domain entities, repository ports, ORM entities, mappers, and repositories
- [ ] Implement DeckService with CRUD operations (create, update, delete, add/remove cards)
- [ ] Create REST API endpoints for decks (CRUD, add/remove cards, list user decks)
- [ ] Build deck list view page (user's saved decks with name, format, card count, estimated value)
- [ ] Build deck detail view page (card list grouped by type, mana curve visualization, price breakdown)
- [ ] Add "Add to Deck" action from card detail and search results
- [ ] Deck import/export (paste decklist text format, CSV)
- [ ] Format legality validation (check deck against format rules - Standard, Modern, Commander, etc.)

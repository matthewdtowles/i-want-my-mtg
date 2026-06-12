# Roadmap

Shipped work is condensed to one line per section under **Done**; small leftover
items from those shipped sections live under **Catch-up**. Active and future work
(Phase 6 onward) is kept in full detail. Verbose history of completed work lives in
git.

---

## Done

### Phase 1: Foundation & Infrastructure

- **1.1 DB to managed instance** — migrated prod from Docker Postgres to AWS Lightsail Managed PostgreSQL 18 (SSL, automated backups/PITR).
- **1.2 Split Scry** — ETL extracted to a standalone `scry` repo with its own CI/CD; web pulls the ETL image from ghcr.io.
- **1.3 Integration test suite** — Docker-based Postgres harness (`docker-compose.test.yml`, port 5433) running e2e suites, wired into CI.
- **1.4 API layer** — versioned `/api/v1/` REST API (JWT + cookie auth, full CRUD, OpenAPI docs at `/api/docs`, response envelope, rate-limit guard).
- **1.5 Progressive web enhancement** — AJAX paginate/sort/filter across all listings, backed by `/api/v1/*` with URL state and toast errors.
- **1.6 Frontend consolidation** — shared `ajaxUtils`, extracted `emptyState`/`statCard` partials, standardized tables/headings, `concat` helper.

### Phase 2: Performance, Accessibility & Features

- **2.1 Pre-fetching** — resource hints, static cache headers + busting, `CacheControlInterceptor`, idle/hover link prefetch, offline service worker.
- **2.2 Lighthouse optimization** — deferred CSS/JS, lazy + sized WebP images, minified Tailwind, dynamic meta; all pages 95+ mobile/desktop.
- **2.3 Standardize card links** — reusable `cardLink.hbs` + `renderCardLink()`, single floating hover/long-press preview element.
- **2.4 Card image interactivity** — Scryfall normal/large images, desktop hover-zoom, mobile tap-to-enlarge modal, motion-gated animations.
- **2.5 Accessibility** — ARIA labels, heading hierarchy, contrast, full keyboard nav, focus trap, skip-link, live regions for AJAX swaps.
- **2.6 SEO** — dynamic meta/OG, JSON-LD on card pages, sitemap index + per-set sitemaps, robots.txt, canonical URLs, Search Console.
- **2.7 Binder view** — page-like grid for set + inventory, list/binder toggle, arrow-key nav, in-binder stepper, view preference.
- **2.8 Bulk transaction upload** — CSV import with shared `CardImportResolver`, per-row validation, error-CSV download.
- **2.9 Site copy & UX guidance** — getting-started guide, first-visit hints, Help icon, fluid typography, page-by-page copy polish.
- **2.10 Set-list block UI** — block-level pagination (`findBlockGroupKeys`, `SetBlockGroup`), mirrored client grouping, indented block-children.
- **2.11 Flavor name** — `flavor_name` column (migration 023), Scry ingestion, full plumbing, shown on card detail + search.
- **2.12 Price notifications** — alert/notification data model (migrations 025/026), idempotent detection, batched emails, daily cron, management pages.
- **2.13 UI polish** — active price-alert badge on card detail; normal/foil price in binder hover overlay.
- **2.14 Site-wide visual refresh** — rolled the pricing page's design language (palette, typography, gradient navbar/footer, surfaces) across the site. Post-rollout Lighthouse re-audit fixed light-mode contrast regressions (a11y 100 mobile + desktop); dark/light toggle verified site-wide.
- **2.15 `in_main` classifier + set-type filter** — scry 5.10/5.11 classifier fixes (card + set level) plus user opt-in set-type preference (migration 033).

### Phase 3: Monetization Foundation

- **3.1 Sealed product support** — schema (migrations 027/028), domain/service/repository, REST API, views, AJAX inventory UI, Scry ingestion.
- **3.2 Legal & compliance** — Fan Content Policy + disclaimer, `/privacy` and `/terms`, `legal@` alias, JSON data export, FK cascade scrub.
- **3.3 Affiliate integration** — TCGPlayer Impact partner; `AffiliateLinkPolicy` wraps product URLs on card + sealed views.
- **3.4 Freemium & billing** — Stripe subscriptions (Checkout, portal, webhooks), `SubscriptionGuard`, depth-gating site-wide, `/pricing`, analytics breakdown. *(model in Appendix)*

### Phase 4: API & Developer Ecosystem (4.1–4.5)

- **4.1 API monetization & tiering** — `api_subscription`/`api_key`/`api_usage` (migration 032), per-user tier limits, key management + usage dashboard at `/user/api-keys`. *(loose ends in Catch-up)*
- **4.2 Developer portal** — `/developer` hub, Redoc docs, three tutorial guides, public OpenAPI spec, RapidAPI listing live + proxy guard. *(loose ends in Catch-up)*
- **4.3 MCP server** — stdio server (separate repo) + in-app streamable-HTTP `/mcp` (33 tools), typed API client, published to npm/registry/Glama/Smithery, Reddit + tutorial + demo GIF. *(loose ends in Catch-up)*
- **4.4 Strict query-param validation (JSON API)** — `validateApiQuery()` 400s invalid filter values (`rarity`/`format`/`legality`/`sort`/`setCode`, transaction `type`) on the API controllers while `SafeQueryOptions` stays lenient for HBS/internal callers; per-context honorable sort sets in `sort-options.enum.ts` shared by repositories + validator and mirrored in the MCP tools. *(PR #507)*
- **4.5 Unify HBS sortable headers with the honorable sort sets** — per-context typed header factories (`setCardSortHeader`/`setSortHeader`/`inventorySortHeader`/`transactionSortHeader`) bind each orchestrator's sortable columns to the matching `*_SORTS` set, so a header offering a non-honorable sort fails to compile (offered ⊆ honorable enforced at build time, not just currently-true).

### Other shipped

- **5.1 External import tools** — Moxfield/Archidekt/Deckbox/TCGPlayer CSV auto-detection on the Free tier, plus JSON-API import/export endpoints.
- **5.2 Content & SEO** — file-based blog, 4 cornerstone articles + building-in-public post, sitemap entries. *(remaining cross-posts under Phase 8)*
- **10.3 Scry interactive mode** — interactive CLI menu (`cargo run -- interactive`) with target selection, prompts, dry-run (separate repo).

---

## Catch-up / loose ends

Small leftover items from otherwise-shipped sections (Phases 1–4.3). Mostly manual, low-priority, or deferred.

- **4.1 API tiering** — `api_usage` retention sweeper (daily cron, delete rows older than 90 days; revisit at ~1M rows); create Stripe API Developer/Business products + set `STRIPE_PRICE_API_*` in dev and prod (manual, not code).
- **4.2 Developer portal** — run RapidAPI's "Test Endpoint" flow on each endpoint and fix unexpected shapes; list on adjacent free marketplaces (APIs.guru, Postman, public-apis) once RapidAPI is stable; color filtering (`?color=`, `?colorIdentity=`) on card search — blocked on Scry populating `card.colors` (see 10.2). Remaining Studio form-filling tracked in [`RAPIDAPI.md`](RAPIDAPI.md).

---

## Phase 6: Buylist Pricing & Vendor Selling Tools

Surface buylist (sell-to-vendor) prices alongside retail, highlight the best buylist offer per card, and help users decide *who to sell to* — especially in bulk. The value lands on a user's inventory: what is my collection worth to *sell*, and which vendor pays most? Prioritized ahead of platform expansion and go-to-market because it's net-new differentiating value (not a re-surfacing of existing features) and it strengthens the core product before we invest in new surfaces and marketing.

Tracked as epic #498 (sub-issues #499–#503, #512–#515). Cross-repo: [scry#14](https://github.com/matthewdtowles/scry/issues/14) (ingest), [iwantmymtg-mcp#9](https://github.com/matthewdtowles/iwantmymtg-mcp/issues/9) (expose via MCP).

Constraints found during scoping: scry currently ingests only the MTGJSON `retail` path and **averages across providers** into one normal/foil value; the web `price` table stores that single averaged value. "Best buylist by vendor" is incompatible with averaging — it needs per-provider (and likely per-condition/finish) data. MTGJSON publishes buylist for a limited set of providers (CardKingdom, Cardsphere); broad vendor coverage likely needs an additional data provider. Direction: stand up a **separate, additive granular price store** (all retail + buylist, per provider) and **derive** today's aggregates from it — non-breaking for current features. The #6.1 spike decides sourcing + architecture before the build.

### 6.1 Spike: Buylist Data Sources & Price-Data Architecture ✅

- [x] Evaluate buylist data sources: MTGJSON buylist coverage (CardKingdom, Cardsphere), Cardsphere's role as an aggregator, and at least one additional provider (vendor APIs vs. scraping — feasibility, cost, ToS/legality, maintenance)
- [x] Design the separate/additive granular price store (provider, retail|buylist, finish/condition) and how to derive the current averaged value from it
- [x] Define the "vendor" model for grouping/optimization (store-credit bonus %, conditions, min/max)
- [x] Deliverable: recommendation doc + refined scope for 6.2–6.5 and scry#14

**Outcome** (`docs/6.1-buylist-price-data-spike.html`): adopt **Tier A + Tier B** — both free, low-maintenance. Tier A expands scry to capture the full MTGJSON tree (per-provider retail + CardKingdom/Cardsphere buylist) instead of averaging; Tier B adds Card Kingdom's free direct pricelist for actionable buylist (live buy qty + condition). Broad multi-vendor coverage (Tier C: go-mtgban scrapers or a paid aggregator) is deferred until 6.3/6.4 show demand. Derive the existing averaged `price` from the granular store so nothing downstream breaks. Vendor metadata stays a code-level constant until the 6.5 optimizer needs the DB table.

### 6.2 Granular Price-Data Store (Capture All, Derive Aggregates) ✅

Mirrors the existing `price` / `price_history` split — a lean current table the card page reads, plus a retention-bounded history table.

- [x] `granular_price` (current per-vendor offer) **+** `granular_price_history` (dated series), migration `034` + init SQL. Columns `(card_id, provider, price_type, finish, condition, date, price)`, `condition NOT NULL DEFAULT 'NM'` (a bare price is NM by convention, so MTGJSON rows get `'NM'` and the key stays NULL-free). **Current** is keyed *without* `date` (one row per series), so the card page reads it with a trivial `WHERE card_id = …`; **history** keys on `date` and is retention-bounded. **No `qty` column** — buy quantity is inconsistent across vendors and deferred to Tier B (Card Kingdom direct), modelled when it lands.
- [x] Derivation stays in scry's domain layer (Rust), **not** a DB function: scry writes per-provider granular rows and the derived averaged `normal`/`foil` into the existing `price` table in one ingest pass, from the same in-memory values — `PriceCalculationPolicy` and all consumers unchanged. (Per-card averaging is in-memory at ingest; unlike `update_set_prices()`, which aggregates across cards)
- [x] Current writes carry a freshness guard (`ON CONFLICT … WHERE EXCLUDED.date >= granular_price.date`): a stale ingest can't move a series backwards, and a vendor that skips a day keeps its last-known offer. `price` already has this property via `clean_up_prices` (keeps the max date).
- [x] `GranularPriceRepositoryPort` + repo/mapper/ORM entity (read-only, current table; consumed by 6.3)
- [x] Population owned by scry (scry#14): daily ingest writes **both** tables; historical backfill writes **history only** (current is filled by the next daily ingest). Retention runs on `granular_price_history` per `(card, provider, type, finish, condition)` series, daily → weekly → monthly. Granular capture is USD-only - providers `tcgplayer`, `cardkingdom`, `cardsphere`, `manapool` (Cardmarket/EUR excluded; no currency column); the derived `price` still averages only the original 3 providers, so it stays byte-identical.

### 6.3 Show Buylist Prices on Card Views ✅

Card price section overhauled into a **Buy** (retail tiles + TCGPlayer) / **Sell** (best buylist per finish, vendors behind a "compare" disclosure) split. (A compact best-offer on the set page / binder was added then **removed in 6.3.1** — buylist now lives only on the card page.) Buylist is single-vendor (Card Kingdom) today (see 6.9), so the per-vendor compare gracefully collapses to one line.

- [x] Read the current `granular_price` table directly via `GranularPriceRepositoryPort` (best buylist offer + per-vendor list, one row per series) — not the averaged `price` table or the dated `granular_price_history`
- [x] Card presenter buylist fields; add buylist tile(s) to `card.hbs` price section, highlight best vendor, respect normal/foil; reuse existing `price-tile` theming
- [x] ~~Same treatment in set page / binder overlay; compact best-offer ("sell $X" on rows, "Buylist $X" on the binder overlay)~~ **Scope-corrected in 6.3.1:** buylist now lives only on the card page; the set-list / binder surfaces were removed (clutter + overflow risk). The batched `findCurrentBuylistByCardIds` read and `bestBuylistOffer` policy are kept for 6.4 inventory best-buylist.
- [x] Vendor metadata (display name + sell-to flag for Card Kingdom, Cardsphere) as a code-level constant; DB `vendor` table deferred to 6.5

### 6.3.1 Buylist surface trim + UI parity + responsive hardening ✅

- [x] Limit buylist to the card page (remove from set list + binder overlay; keep batched read for 6.4)
- [x] Buy/Sell visual parity: render Sell offers as price-tiles (emerald accent) matching retail
- [x] Responsive contract: base-layer min-width:0 / max-width / overflow-wrap guards
- [x] `.cluster` + `.badge-pill` utilities; fix legality-tag and set-toolbar overflow
- [x] Fix navbar mobile overflow: container-query that hides Sign In/Sign Up <599px now ordered after the base `display` rules so it wins (was a source-order bug the guard caught)
- [x] Playwright overflow guard at 320/375px across key pages (regression gate)

### 6.4 Inventory: Market Sell Value & CSV Export ✅

Where the value of the epic lands: what is the user's collection worth to *sell*, right now,
with real offers behind the number. Framed as **market sell value** in all user-facing copy —
vendor-neutral, no named-vendor pitch. Buylist offers come from a single upstream source today
(see 6.9), so the per-vendor grouping degenerates gracefully to one group; the grouping
structure stays so additional sources (Tier C) slot in additively, not as a refactor.

**As built:** `/inventory/sell` page (linked from the inventory header). `buildSellPlan`
(`src/core/pricing/sell-value.policy.ts`, pure) matches inventory items to offers on card +
finish (isFoil → foil, else normal; etched is a distinct product), picks the best NM offer via
`bestBuylistOffer`, and groups by vendor. `GranularPrice.qty` plumbed through the read path
(entity/mapper) for the cap. Selection = row checkboxes that *are* the export form's inputs
(`POST /inventory/sell/export`, works without JS); `inventorySell.js` recomputes totals
client-side. CSV: `name,set_code,number,finish,owned_qty,vendor,offer,sellable_qty,payout`.

- [x] Select a subset (or all) of inventory — checkboxes on the sell view (per-vendor select-all; default all selected)
- [x] Compute the best buylist offer per item and total it as the selection's market sell value
- [x] Cap payouts by buy quantity where known (offer × min(owned, vendor buy qty) — the 6.7 `qty`; capped rows flagged) so totals are honest
- [x] Group results by vendor (single group today; feeds 6.5 and Tier C)
- [x] Sell rows link out to the vendor's buylist page for the card (plain links, no partner attribution — deferred from 6.7)
- [x] CSV export of the sell list (per-item offer, qty, payout) honoring the selection

### 6.5 Sell/Buy List Optimizer (re-scoped: cash vs. credit first)

Re-scoped after the 6.9 research: with buylist effectively single-source upstream, the
*vendor-comparison* optimizer has no decision to make — but **cash vs. store credit** is a real
decision even with one vendor (store-credit bonus % means "take $X cash, or $Y in credit applied
against your buy list"). Build that first; the multi-vendor consolidation optimizer is gated on
6.9 landing a second source.

- [ ] Sell-list and buy-list entities per user
- [ ] Cash-vs-credit optimizer: net outcome of cash payout vs. store-credit bonus % applied against the user's buy list and retail buy prices
- [ ] Present the recommendation clearly; CSV export of the plan
- [ ] Mirror via MCP ([iwantmymtg-mcp#9](https://github.com/matthewdtowles/iwantmymtg-mcp/issues/9))
- [ ] **Gated on 6.9 (≥2 buylist sources):** best net outcome per vendor; favor consolidating into a single vendor/bulk transaction where it wins

### 6.6 Condition Vocabulary Normalization (follow-up, after 6.2/6.3)

Open question deferred from 6.2 — not blocking, since every row in 6.2/6.3 is `NM`. Revisit only when a source actually delivers multi-grade prices (likely Tier C, or a future CK-retail-by-grade ingest).

- [ ] Decide the canonical **raw-condition** representation and the per-vendor converters. Candidate (from scoping): a normalized numeric rank so "best condition" / offer-matching are cheap comparisons. Caveat: CK (NM/EX/VG/G, 4 grades) and TCGplayer (NM/LP/MP/HP/DMG, 5 grades) don't map 1:1, so any shared scale is lossy cross-vendor — keep the source grade where fidelity matters
- [ ] Keep **professional grading a separate dimension** (grading company + numeric grade, allowing half-grades like BGS 9.5) rather than overloading the raw-condition column — a slabbed PSA 9 is a distinct product/market from a raw NM, and a different `tcgplayerProductId`
- [ ] Backfill is trivial: existing rows are all `NM` → map to whatever the canonical NM value becomes

### 6.7 Tier B: Card Kingdom Direct Ingest (live buylist + `scryfall_id` matching) ✅

Adds Card Kingdom's free direct pricelist (`api.cardkingdom.com/api/v2/pricelist`, ~147k products, streamed) for actionable buylist: live `price_buy` + `qty_buying`, overwriting the indicative MTGJSON CK row on the shared granular key (MTGJSON ingests first, CK-direct last → last-writer-wins). As-built log in [`docs/phase6-buylist-handoff.md`](docs/phase6-buylist-handoff.md) + issue #513. Merged via PR #522.

- [x] `card.scryfall_id` — **unique indexed column, NOT the PK** (`card.id` stays the MTGJSON uuid). Migration `036`, SQL backfill from `card.img_src` (verified 1:1 across all 91,316 cards); scry stores it going forward
- [x] Stream the CK pricelist in scry (`CkPricelistEventProcessor`), `scryfall_id → card.id` map, emit `granular_price` + `granular_price_history` buylist rows (`provider='cardkingdom'`, finish from `is_foil`, condition `NM`); only real offers emit (`price_buy > 0 AND qty_buying > 0`); per-series dedupe keeps the best offer; best-effort (never blocks the averaged price refresh)
- [x] Buy-quantity re-introduced: nullable `qty` on both granular tables; `qty = EXCLUDED.qty` (last-writer-wins, not COALESCE) so a failed CK fetch reads NULL ("unknown") rather than stale. Surfacing qty deferred to 6.4

### 6.8 Normalize card image: derive from `scryfall_id`, drop `img_src` — **directly after 6.7**

`img_src` is pure derived data: scry stores exactly `{a}/{b}/{scryfall_id}.jpg` and the web renders `${BASE_IMAGE_URL}/${size}/front/${img_src}` — a total, reversible function of `scryfall_id`. Once 6.7 adds the `scryfall_id` column, storing `img_src` too is denormalized (same fact, two columns), and `scryfall_id` is strictly more useful (it also drives CK matching + Scryfall API interop). Do this **immediately after Tier B**, while it's fresh.

- [ ] Drop the stored `card.img_src` column; scry persists `scryfall_id` only (stop computing/storing the path).
- [ ] Derive the image at read time via a shared helper (TS mirror of `Card::build_scryfall_image_path`): `${BASE_IMAGE_URL}/${size}/front/${a}/${b}/${scryfall_id}.jpg`.
- [ ] **Keep the external contract:** the `imgSrc` field stays in the JSON API DTOs (`card-api`, `inventory-api`), MCP output schemas, and HBS views — computed from `scryfall_id` in the presenter, not read from a column (~6–8 read sites).
- [ ] Fix `json-ld.util.ts` to emit an **absolute** image URL (it currently sets `schema.image` to the raw `{a}/{b}/{id}.jpg` tail — an already-broken link).
- [ ] Front-face only is preserved (the scheme always serves `/front/`); back/DFC images remain a separate future feature.

### 6.9 Tier C: Broaden Buylist Vendor Coverage (find more buylist sources)

Promoted from "deferred" by a live-ingest finding (scry#14 Tier A), then **confirmed against the raw MTGJSON feed** (`AllPricesToday.json`, 2026-06-05 data, inspected 2026-06-07): of the four USD providers scry captures, **only `cardkingdom` carries buylist data** (61,428 cards). `cardsphere` — the second buylist source the 6.1 spike assumed — **does not appear in the feed at all** (0 occurrences); `tcgplayer` / `manapool` (and the excluded EUR `cardmarket`) emit an **empty `buylist` key with no values**. So this is **not an ingest bug** — scry captured everything present; buylist is **upstream single-vendor (Card Kingdom only)** today, which undercuts the premise of "best buylist *by vendor*": with one vendor there is nothing to compare, and the 6.5 optimizer has no decision to make. Tier B (6.7) sharpens Card Kingdom's numbers but adds **no new vendor**, so it does not fix this on its own.

**Researched (2026-06-09, full findings on #515): no free, legitimate, multi-vendor buylist API exists.** TCGplayer shut down its buylist program (July 2024); Cardsphere is peer-to-peer and absent from the MTGJSON feed; the remaining buylist vendors (Star City Games, CoolStuffInc, ABU Games, Troll & Toad) publish no APIs — reachable only via go-mtgban scrapers (free, but ToS-gray, AGPL, a Go sidecar next to the Rust ETL, perpetual breakage maintenance) or the mtgban BAN API at $1,000/mo. **Decision: proceed single-source.** 6.4 ships framed as vendor-neutral **market sell value**; 6.5 is re-scoped to the cash-vs-credit decision; the multi-vendor pieces stay gated here.

- [x] Evaluate additional buylist sources — done; no viable free/legitimate option (see findings on #515)
- [x] Re-sequence decision: 6.4/6.5 do **not** wait for broader coverage — built single-source with vendor-neutral framing; the per-vendor comparison + consolidation optimizer are gated on this item
- [ ] scry cleanup: drop `cardsphere` from `GRANULAR_PROVIDERS` (confirmed absent upstream; yields nothing today)
- [ ] Revisit go-mtgban / a paid aggregator only when **both** hold: (a) 6.4 has shipped and sell-flow engagement shows demand for vendor comparison; (b) revenue can absorb the scraper ops burden or an aggregator fee

Extend the product's surface area so newcomers can use it where they expect to — phone first. Recurring feedback is that people expect a mobile app to try the product at all, so platform expansion is sequenced ahead of the go-to-market push (Phase 8): drive adoption onto surfaces newcomers can actually use before the marketing spend lands.

### 7.1 Mobile App (Cross-Platform)

- [ ] Choose framework (React Native recommended given JS background; Flutter if Dart is appealing)
- [ ] Scaffold mobile app project in new repo
- [ ] Integrate with API layer
- [ ] Implement core views: collection browsing, card search, transaction logging
- [ ] Add camera-based card scanning (Google ML Kit or similar — potential premium-only feature)
- [ ] Market cross-platform sync as core differentiator ("scan on phone, manage on web")
- [ ] TestFlight / internal testing distribution
- [ ] App Store and Play Store submission

### 7.2 Desktop App (Optional)

- [ ] Evaluate whether desktop app adds value beyond existing PWA capabilities (service worker, offline support)
- [ ] If proceeding: choose framework (Tauri recommended — lighter than Electron, wraps existing web frontend)
- [ ] Add desktop-specific features (bulk local file import, keyboard shortcuts, system tray for price alerts)
- [ ] Distribute via direct download and platform stores

### 7.3 Import Inventory by Picture

- [ ] Research card recognition APIs/libraries (Scryfall image matching, ML models)
- [ ] Design image upload and processing flow
- [ ] Implement image capture UI (web + mobile)
- [ ] Implement card identification from image
- [ ] Add review/confirm step before adding to inventory
- [ ] Handle multiple cards in single image
- [ ] Test accuracy and iterate on recognition

---

## Phase 8: Go-to-Market

The marketing push — community, launch events, analytics — split out from platform expansion and sequenced after it (Phase 7) so the spend lands on a product newcomers can actually use on any device.

### 8.1 Community Engagement

- [ ] Engage authentically in key communities before promoting (r/mtgfinance, r/magicTCG, r/EDH, MTG finance Discord servers)
- [ ] Create dedicated Discord server for app feedback and community
- [ ] Post "Show Reddit" style post on r/mtgfinance when product is polished
- [ ] Reach out to 3–5 MTG content creators (MTG Goldfish, Tolarian Community College, finance-focused YouTubers)
- [ ] Share each cornerstone blog post in its matching subreddit (r/mtgfinance for sell timing + serious collectors, r/magicTCG for getting-started, r/EDH where relevant) — from 5.2

### 8.2 Launch Events

- [ ] Submit to Product Hunt (Tuesday/Wednesday launch with screenshots, demo video, value proposition)
- [ ] Post on Hacker News (Show HN — developer-hobbyist crossover audience)
- [ ] Cross-post the "building in public" piece on HN ("Show HN: ...") and dev.to/Hashnode with canonical URL pointing back to the blog — from 5.2
- [ ] Offer content creators early access + free premium + referral codes

### 8.3 Analytics

- [ ] Set up privacy-respecting analytics (PostHog or Plausible)
- [ ] Track key metrics: DAU/MAU, free-to-premium conversion, affiliate CTR, API adoption, churn
- [ ] Run monthly feedback cycle from Discord community and support requests

---

## Phase 9: Advanced Monetization & Ecosystem

### 9.1 Peer-to-Peer Transaction Facilitation

- [ ] Research legal and compliance requirements (money transmitter regulations — consult a lawyer)
- [ ] Build trade/sale matching system (users list cards to sell/trade, system matches buyers, 3–5% fee)
- [ ] Implement reputation and trust systems (ratings, verified history, dispute resolution)
- [ ] Start small — limit to verified users in same region or LGS, expand geographically as trust matures

### 9.2 LGS (Local Game Store) Tools

- [ ] Build store-facing dashboard for inventory management (track inventory, set prices vs. market data, buylist pricing)
- [ ] Offer "Store" subscription tier ($49–99/month) with POS integration, customer want-lists, event inventory
- [ ] Partner with 5–10 LGS owners as beta testers

### 9.3 Data & Analytics Products

- [ ] Build aggregated market trend reports (weekly/monthly price movements, format staples, set value trends)
- [ ] Explore anonymized data licensing for content creators, store chains, and market analysts (only viable at scale)

### 9.4 Premium Bundling for Multi-Platform

- [ ] Revisit subscription tiers to reflect multi-platform value (one account, everywhere)
- [ ] Consider "Collector Pro" tier ($7.99–9.99/month) bundling premium app + Developer-tier API access

---

## Phase 10: Architecture

### 10.1 Evaluate Removing NestJS Dependency

- [ ] Audit current NestJS features used (DI, guards, pipes, interceptors, etc.)
- [ ] Evaluate lightweight alternatives (Fastify standalone, Express + tsyringe, etc.)
- [ ] Compare dependency tree size (before/after)
- [ ] Decide: migrate or keep NestJS
- [ ] If migrating: plan incremental migration strategy
- [ ] If migrating: execute migration module by module
- [ ] If keeping: document decision and rationale

### 10.2 Portfolio Breakdown: by=color Dimension

Deferred from 3.4. Blocked on Scry repo: needs `card.colors` populated from MTGJSON `colorIdentity` first. Once that lands, add a `color` case to `PortfolioBreakdownRepository.dimensionConfig()` and a tab on `portfolioBreakdown.hbs`.

- [ ] Scry: ingest `card.colors` from MTGJSON `colorIdentity` into the `card` table
- [ ] Add `color` case to `BreakdownDimension` and `dimensionConfig()`
- [ ] Add "By Color" tab to `portfolioBreakdown.hbs`

### 10.4 Feature: Deck Building

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

---

## Appendix: Freemium model (reference)

Free vs premium feature split, kept for reference (from 3.4).

#### Depth gating, no creation caps

Competitor benchmarks (April 2026): Dragon Shield $2.99/mo with hard 100-card cap (widely criticized), ManaBox $2.49/mo gating decks not inventory, Deckbox $3.99/mo with QoL-only premium, Moxfield/Archidekt mostly free. Hard caps convert poorly and damage word-of-mouth. IWMM positions closer to Moxfield/Deckbox: free tier is fully usable forever; premium unlocks depth (analytics, history, external integrations, scanning) - the things serious collectors care about.

**Pricing:** $3.99/mo, $39.99/yr (matches Deckbox annual; annual saves ~2 months vs monthly). Set via Stripe Prices and `STRIPE_PRICE_*` env vars.

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
- Advanced analytics (collection value breakdown by set, format, color, rarity)
- Card image scanning - ships in Phase 7.3
- Priority support
- Early access to new features

External imports moved to Free (April 2026, Phase 5.1) — gating acquisition behind a paywall while three direct competitors (Moxfield, Archidekt, Deckbox) let users import for free traded too much top-of-funnel for too little conversion. The Premium pull is the financial analysis (P&L, portfolio history, cost basis, advanced analytics) that only matters after the user has data in the system — imports are the funnel into those features, not a feature in themselves.

API rate limits remain 100/day for free and premium alike - all API monetization is the separate Developer/Business tiers (4.1).

**Conversion model implication:** with no creation caps, conversion depends on users _wanting_ depth features. Zero retroactive disruption to existing users (nothing taken away), zero churn risk, no grandfathering required. The load-bearing premium pitches are the financial-analysis features (portfolio history, P&L, cost basis, advanced analytics — all shipped) and card image scanning (Phase 7.3).

# Roadmap

**Now** is what is actually in flight. Everything shipped is condensed to one line
per section under **Done**; small leftovers from shipped sections live under
**Catch-up**; unstarted future work is under Phases 8 and 9. Verbose history lives
in git.

---

## Now

Three open threads. Two are the public store releases (Phase 7.1's only remaining
scope); one is a production break found 2026-07-22.

**1. iOS App Store — clear the Guideline 3.1.1 rejection.** Builds through 0.2.0 (7)
were rejected **four times** under 3.1.1. Root cause was ours: the backend returned
price-alert error strings naming "Premium" and `/pricing`, and the app rendered them
verbatim as native alerts, so App Review read the app as steering users to an external
purchase. Fixed in web [#607](https://github.com/matthewdtowles/i-want-my-mtg/pull/607)
+ mobile [#83](https://github.com/matthewdtowles/i-want-my-mtg-mobile/pull/83); build
0.2.1 is on TestFlight and verified. Remaining: post the Resolution Center reply and
submit. Runbook: [mobile #84](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/84).

> **Standing rule this produced:** no `4xx` body on a path the mobile app can reach may
> contain "Premium", "Upgrade", "Free plan", a tier name, or a pricing URL. State the
> limit neutrally and let each client steer. Enforced in `CLAUDE.md`; exemptions
> (API-key traffic, `src/mcp/`) are listed there.

**2. Android → Play production.** The 12-tester / 14-day closed test is served and
production access has been applied for. Remaining: promote the tested build, submit,
roll out. Tracker: [mobile #60](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/60).

**3. `scry retention` is failing in production.** It prunes `granular_price_history`,
which migration 042 dropped in §10.10. The error aborts the run before the
set-price-history and portfolio retention steps, so **neither has been pruned since
the S4 change shipped (~2026-07-09)**. Fix is a deletion.
[scry #63](https://github.com/matthewdtowles/scry/issues/63).

After these three, the next substantive product work is **7.3 card scanning** — the
load-bearing premium pitch that is still unbuilt (see Appendix).

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
- **4.3 MCP server** — stdio server (separate repo) + in-app streamable-HTTP `/mcp` (37 tools; the standalone npm server now exposes 59), typed API client, published to npm/registry/Glama/Smithery, Reddit + tutorial + demo GIF. *(loose ends in Catch-up)*
- **4.4 Strict query-param validation (JSON API)** — `validateApiQuery()` 400s invalid filter values (`rarity`/`format`/`legality`/`sort`/`setCode`, transaction `type`) on the API controllers while `SafeQueryOptions` stays lenient for HBS/internal callers; per-context honorable sort sets in `sort-options.enum.ts` shared by repositories + validator and mirrored in the MCP tools. *(PR #507)*
- **4.5 Unify HBS sortable headers with the honorable sort sets** — per-context typed header factories (`setCardSortHeader`/`setSortHeader`/`inventorySortHeader`/`transactionSortHeader`) bind each orchestrator's sortable columns to the matching `*_SORTS` set, so a header offering a non-honorable sort fails to compile (offered ⊆ honorable enforced at build time, not just currently-true).

### Phase 5: External tools & content

- **5.1 External import tools** — Moxfield/Archidekt/Deckbox/TCGPlayer CSV auto-detection on the Free tier, plus JSON-API import/export endpoints.
- **5.2 Content & SEO** — file-based blog, 4 cornerstone articles + building-in-public post, sitemap entries. *(remaining cross-posts under Phase 8)*

### Phase 6: Buylist Pricing & Vendor Selling Tools ✅

Surface buylist (sell-to-vendor) prices so users see what their collection is worth to *sell* and who pays most. Epic #498 closed 2026-06-13. Buylist proved **upstream single-source (Card Kingdom only)** — no free, legitimate multi-vendor buylist API exists (TCGplayer shut its program July 2024; Cardsphere is peer-to-peer and absent from the MTGJSON feed) — so the per-vendor comparison optimizer and Tier C coverage are **gated on a second source appearing** and reopen only on demand + revenue.

- **6.1 Spike** — evaluated buylist sources + designed the additive granular price store; chose Tier A (full MTGJSON per-vendor tree) + Tier B (Card Kingdom direct), deferred Tier C. *(`docs/6.1-buylist-price-data-spike.html`)*
- **6.2 Granular price store** — `granular_price` per-vendor table (migration 034); averaged `price` derived in scry's domain layer in one pass. *(later cut to CK-buylist-only — see 10.10)*
- **6.3 Buylist on card views** — card price section split into Buy (retail tiles) / Sell (best buylist per finish, vendors behind a compare disclosure); trimmed to card-page-only in 6.3.1.
- **6.4 Inventory market sell value + CSV** — `/inventory/sell`, pure `buildSellPlan`, best-NM offer per item capped by buy qty, vendor-neutral framing, selection-aware CSV export.
- **6.5 Cash-vs-credit optimizer** — per-user `buy_list` (migration 039) + `/buy-list` page + `/optimizer` (cash vs. store-credit bonus %). Multi-vendor consolidation gated on 6.9.
- **6.6 Condition normalization** — ⏭️ skipped (#512): all data is single-grade NM; revisit only when a multi-grade source lands.
- **6.7 Tier B: Card Kingdom direct ingest** — live `price_buy` + `qty_buying` via `card.scryfall_id` matching (migration 036), last-writer-wins over the indicative MTGJSON CK row.
- **6.8 Image normalization** — derive the image path from `card.scryfall_id` at read time, drop the denormalized `img_src` column (migrations 037/038, coupled web+scry deploy).
- **6.9 Tier C: broaden vendor coverage** — ⏭️ skipped (#515): no viable free/legitimate multi-vendor source; proceed single-source, multi-vendor pieces stay gated.
- **Follow-up** — JSON API for buylist/sell/optimizer shipped (#530); mirror via MCP still open ([iwantmymtg-mcp#9](https://github.com/matthewdtowles/iwantmymtg-mcp/issues/9)).

### Phase 10: Architecture ✅

10.1 (evaluate removing NestJS) was dropped — staying on NestJS. Everything else shipped.

- **10.2 Portfolio breakdown by color** ✅ — `card.colors text[]` (migration 040), "By Color" membership/overlap tab + superset color filter, exposed on the API (`?colors=`) + MCP.
- **10.3 Scry interactive mode** ✅ — interactive CLI menu (`cargo run -- interactive`) with target selection, prompts, dry-run (scry repo).
- **10.4 Deck building (MVP)** ✅ — `deck`/`deck_card` (migration 041), CRUD + `/decks` list + `/decks/:id` detail with per-card legality + estimated value, "Add to Deck" on card pages. *(deferred: mana-curve viz, full construction-rule validation)*
- **10.5 Portfolio analytics drill-down** ✅ — inline lazy-loaded card slices on `/portfolio/breakdown` (#535), no-JS fallback to `?expand=`.
- **10.6 Deck building in-page card search** ✅ — name-grouped search (`groupBy=name`, newest printing) on the deck page, inline add to main/sideboard (#536).
- **10.7 Import public decklists + buildability** ✅ — paste-text import, inventory gap/completeness, tournament catalog (`published_deck*`, migration 043, fbettega feed via Scry), browse + compare at `/published-decks` (#537). *(deferred: URL/per-site paste import, archetype enrichment, fuzzy matching)*
- **10.8 Scry: ingestion performance regression** ✅ — the granular per-vendor price store was the cause; investigation concluded **cut, don't optimize** (`granular_price_history` was write-only; ~82% of `granular_price` rows were never-read retail; the MTGJSON CK buylist was 88% stale and fully covered by CK-direct). Executed in 10.10, which superseded/closed the tiered-optimization issues scry#24–#27/#31. The remaining sealed `AllPrintings` re-stream was then solved by a **single-pass tee** — one stream feeding both the card and sealed extractors instead of downloading + tokenizing the file twice (scry PR #33). Full ingest **~27 min → ~4.4 min**; scry#22 closed 2026-06-21.
- **10.9 MCP: color breakdown + deck building parity** ✅ — regenerated API types, fixed the `get_portfolio_breakdown` dimensions (dropped the non-existent `format`, added `color` + the `colors` filter), added the 10-tool deck group (iwantmymtg-mcp#16).
- **10.10 Cut granular price store → CK-direct-only buylist** ✅ — dropped `granular_price_history` + purged unread retail/stale rows (migration 042); price ingest ~18 min → ~1 min (scry#32 + #538, verified 2026-06-20).
- **10.11 Scry: no-op batch concurrency** ✅ — `CONCURRENCY = 6` + a `Semaphore` + `tokio::spawn` added overhead with no benefit, since `save_card_batch` awaited the join handle immediately and `parse_stream` awaited `on_batch` before advancing. Took the simplify option: spawn/semaphore removed, batch work runs inline and the code now says so (scry PR #48). Genuine concurrency exists only where it pays — `buffer_unordered` on the fbettega deck fetches (scry PR #58).

### Phase 11: Cross-Repo Hardening ✅

Four codebase analyses run **2026-07-07** produced 29 work packages across all four repos. Quality/hardening only (correctness, integrity, security, tooling, structure) — no new product surface. Executed in three waves 2026-07-09 → 2026-07-18; every work package and every carved-off remainder is closed. Findings with file/line refs: [`docs/codebase-analyses-2026-07/`](docs/codebase-analyses-2026-07/); sequencing rationale + work-package → issue mapping: [`docs/cross-repo-analysis-plan-2026-07.md`](docs/cross-repo-analysis-plan-2026-07.md).

- **Wave 1 — correctness, integrity, security** (gated the Phase 8 push) — web: `ON DELETE CASCADE` migration (W9), domain-error boundary end to end (W1), transactional ledger/inventory writes + oversell row-lock (W2). scry: prune foreignness, delete/reset FK coverage, ingest robustness, `granular_price_history` retention (S1–S4 — **S4 was wrong**: it added retention for a table 10.10 had already dropped, breaking the whole retention command; see **Now** #3). mcp: correctness bundle (M1). mobile: sign-out cache clear — a cross-account data leak — and CI spec-drift decoupling (MB1/MB2).
- **Wave 2 — hardening + the OpenAPI spec chain** — web: OpenAPI fixes + delta-quantity endpoints (W8), query/input hardening (W3), security hardening (W4: no-leak ≥500s, signup enumeration/timing, sha256 token storage, Stripe status validation), performance (W5: anon set page, bulk import resolution, latest-price helper). scry: no-op concurrency + dead granular parsing removed (S5), thin `main.rs` + `IngestPipeline` + ports (S6), clippy/fmt CI gates + Docker hardening + schema-fixture sync (S8). mcp: generic `ToolDefinition` + auth invariant test (M2), Biome/NodeNext/Node 20 tooling (M4). mobile: behavior fixes, unread-count badge + inbox pagination, centralized query keys, ESLint + tests (MB3–MB6).
- **Wave 3 — structure + consistency** — web: TypeScript strictness ratchet + type-aware lint + `quality` CI gate (W6), architecture cleanup (W7: dead code, read models, presenters, logging). scry: DRY/perf/transactionality (S7). mcp: consistency sweep (M3). mobile: shared UI + hooks layer (MB7).
- **Remainders (all closed)** — web [#596](https://github.com/matthewdtowles/i-want-my-mtg/issues/596): set-price presenter (PR #598), repo-wide SEO/meta move (PR #599), OpenAPI response-schema backfill (PR #603), orchestrator-spec test backfill (PR #605). scry [#54](https://github.com/matthewdtowles/scry/issues/54)/[#57](https://github.com/matthewdtowles/scry/issues/57): SQL dedup, prune batching + bounded-concurrency fetches, `SubtreeCollector` parser unification, vestigial-command removal (PRs #55–#61). mcp [#29](https://github.com/matthewdtowles/iwantmymtg-mcp/issues/29): schema/query dedup + as-never sweep. mobile [#79](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/79): component/hook extractions (PRs #80/#81).
- **Cross-repo orderings, all satisfied** — X1 (W9 → S2), X2 (retention), X3/X4 (MB2 before W8, then client regen), X5 (scry fixture synced from the web schema), X6 (both clients verified against the post-W1 `{ success, error }` envelope).

### Phase 7.1: Mobile app — build ✅

All feature work is shipped and live in both beta channels (iOS TestFlight 2026-06-24,
Android Play closed testing 2026-07-02). Only the two **public** store releases remain,
and they are in **Now** above. Full inventory in the mobile repo's `HANDOFF.md`;
remaining release steps in its `GO-LIVE.md`.

- **Stack (decided 2026-06-22)** — React Native + Expo (managed), TypeScript, expo-router,
  TanStack Query, EAS Build/Submit. Chosen over Flutter and bare RN for one language across
  web/API/MCP/mobile and a solo-maintainable toolchain. Repo:
  [`i-want-my-mtg-mobile`](https://github.com/matthewdtowles/i-want-my-mtg-mobile).
- **No new backend** — consumes the existing `/api/v1` through a client generated from the
  published OpenAPI spec (same source the MCP server uses; CI fails on spec drift). Auth
  needed no change: login already returns `{ accessToken }` and the JWT strategy reads the
  bearer header first.
- **v1 (#1–#8)** — browse, inventory, transactions, portfolio, plus both beta distributions.
- **v2** — dark mode, account/settings with in-app account deletion, bulk add, transaction
  edit/delete, price-history chart, buy-list + CSV import, price alerts, notification inbox
  + badge, decks, push notifications end to end, native sign-up (web
  [#602](https://github.com/matthewdtowles/i-want-my-mtg/pull/602)) with no web redirects
  left in the app.
- **Backend enablers** — refresh-token persistent login (#558), device registration + Expo
  push fan-out (#556/#559/#560), and `@ApiProperty`/`ApiOkEnvelope` annotation backfills so
  write DTOs generate real types (#549/#550/#557/#562/#563). All spec/annotation-only; no
  behavior change to existing clients.
- **Store compliance** — Apple + Google developer accounts enrolled; account deletion
  in-app; Play Data Safety + listing assets done. **Monetization posture: read/track only —
  no upgrade button, no web-purchase steering inside the app.** Stripe stays web-only;
  native IAP is the much larger alternative if that ever changes. See the 3.1.1 note in
  **Now** for what happens when this leaks into an error string.

---

## Catch-up / loose ends

Small leftover items from otherwise-shipped sections (Phases 1–4.3). Mostly manual, low-priority, or deferred.

- **4.1 API tiering** — `api_usage` retention sweeper (daily cron, delete rows older than 90 days; revisit at ~1M rows); create Stripe API Developer/Business products + set `STRIPE_PRICE_API_*` in dev and prod (manual, not code).
- **4.2 Developer portal** — run RapidAPI's "Test Endpoint" flow on each endpoint and fix unexpected shapes; list on adjacent free marketplaces (APIs.guru, Postman, public-apis) once RapidAPI is stable. Remaining Studio form-filling tracked in [`RAPIDAPI.md`](RAPIDAPI.md).
- **Color filtering on card search** — **no longer blocked.** `card.colors` has been populated since 10.2, but `colors` is still only wired to the portfolio breakdown; card search and `list_set_cards` have no color filter on the HBS, JSON-API, or MCP surfaces. This is now ordinary work, not a dependency wait — the largest single gap left in the catalog API. [#609](https://github.com/matthewdtowles/i-want-my-mtg/issues/609).

---

## Phase 7: Platform Expansion

Extend the product's surface area so newcomers can use it where they expect to — phone first. Recurring feedback is that people expect a mobile app to try the product at all, so platform expansion is sequenced ahead of the go-to-market push (Phase 8): drive adoption onto surfaces newcomers can actually use before the marketing spend lands.

### 7.1 Mobile App — public store releases

The build is done (see **Phase 7.1** under Done). What is left is two store
submissions, both tracked in **Now** at the top of this file:

- [ ] **iOS App Store** — clear the Guideline 3.1.1 rejection and ship 0.2.1
      ([mobile #84](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/84),
      superseding the older checklist in
      [#20](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/20))
- [ ] **Google Play production** — promote the tested build and roll out
      ([mobile #60](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/60))

Two facts that keep biting, kept here because they are easy to forget:

- **Releases are manual.** Merging to `main` tags a version; it does not build or
  submit. `npm run ship:ios` / `ship:android` reach TestFlight and Play testing
  tracks only — a public release is a separate, deliberate Submit-for-Review in
  App Store Connect / Play Console.
- **Deferred, still true:** EAS Update (OTA) was never set up, so JS-only fixes
  still need a full store build. If social login is ever added, offering any
  social provider forces Sign in with Apple alongside it; plain email/password
  avoids that.

Ordered runbook for both: the mobile repo's
[`GO-LIVE.md`](https://github.com/matthewdtowles/i-want-my-mtg-mobile/blob/main/GO-LIVE.md).
Cross-repo progress rolls up on the "I Want My MTG" GitHub project
(`PVT_kwHOAP2Yos4A4tP0`).

### 7.2 Desktop App — not planned

**Recommend closing [#314](https://github.com/matthewdtowles/i-want-my-mtg/issues/314).**
The site is already an installable PWA with a service worker and offline support, so a
Tauri shell would add a build target and a release channel to maintain in exchange for
a system tray icon. The three desktop-specific ideas (local file import, keyboard
shortcuts, tray price alerts) are all reachable today: import is a web upload, keyboard
nav already exists, and price alerts ship over email and push.

Revisit only on a concrete trigger — users asking for it, or a feature that genuinely
needs filesystem access the browser cannot give.

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

**Run these out of numerical order: 8.3 → 8.1 → 8.2.** Analytics is instrumentation, not
reporting — standing it up *after* the launch push means the one week with real traffic
is the week with no measurement. Get PostHog/Plausible in first, then seed the
communities, then fire the Product Hunt / Show HN day at a product you can watch. The
section numbers are kept as-is because they match issues
[#431](https://github.com/matthewdtowles/i-want-my-mtg/issues/431)–[#433](https://github.com/matthewdtowles/i-want-my-mtg/issues/433).

**Gate:** do not start 8.2 until both stores are public (Phase 7.1). A Show HN that
lands on "iOS coming soon" spends the one launch you get.

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

Everything here is **gated on scale** — each item needs a user base that does not exist
yet, so none of it should start before Phase 8 produces real numbers. Suggested order if
and when it does: **9.4 → 9.2 → 9.3 → 9.1.**

9.4 is a pricing-page change against users you already have. 9.2 needs 5–10 store
relationships. 9.3 explicitly says "only viable at scale." 9.1 is last on purpose:
taking a cut of peer-to-peer payments is the one item that can put money transmitter
regulation between you and a lawyer, and it is the hardest to unwind once launched.

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

# Roadmap

Shipped work is condensed to one line per section under **Done**; small leftover
items from those shipped sections live under **Catch-up**. Active and future work
(Phase 7 onward) is kept in full detail. Verbose history of completed work lives in
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

### Phase 10: Architecture (shipped)

- **10.2 Portfolio breakdown by color** ✅ — `card.colors text[]` (migration 040), "By Color" membership/overlap tab + superset color filter, exposed on the API (`?colors=`) + MCP.
- **10.3 Scry interactive mode** ✅ — interactive CLI menu (`cargo run -- interactive`) with target selection, prompts, dry-run (scry repo).
- **10.4 Deck building (MVP)** ✅ — `deck`/`deck_card` (migration 041), CRUD + `/decks` list + `/decks/:id` detail with per-card legality + estimated value, "Add to Deck" on card pages. *(deferred: mana-curve viz, full construction-rule validation)*
- **10.5 Portfolio analytics drill-down** ✅ — inline lazy-loaded card slices on `/portfolio/breakdown` (#535), no-JS fallback to `?expand=`.
- **10.6 Deck building in-page card search** ✅ — name-grouped search (`groupBy=name`, newest printing) on the deck page, inline add to main/sideboard (#536).
- **10.7 Import public decklists + buildability** ✅ — paste-text import, inventory gap/completeness, tournament catalog (`published_deck*`, migration 043, fbettega feed via Scry), browse + compare at `/published-decks` (#537). *(deferred: URL/per-site paste import, archetype enrichment, fuzzy matching)*
- **10.10 Cut granular price store → CK-direct-only buylist** ✅ — dropped `granular_price_history` + purged unread retail/stale rows (migration 042); price ingest ~18 min → ~1 min (scry#32 + #538, verified 2026-06-20).

---

## Catch-up / loose ends

Small leftover items from otherwise-shipped sections (Phases 1–4.3). Mostly manual, low-priority, or deferred.

- **4.1 API tiering** — `api_usage` retention sweeper (daily cron, delete rows older than 90 days; revisit at ~1M rows); create Stripe API Developer/Business products + set `STRIPE_PRICE_API_*` in dev and prod (manual, not code).
- **4.2 Developer portal** — run RapidAPI's "Test Endpoint" flow on each endpoint and fix unexpected shapes; list on adjacent free marketplaces (APIs.guru, Postman, public-apis) once RapidAPI is stable; color filtering (`?color=`, `?colorIdentity=`) on card search — blocked on Scry populating `card.colors` (see 10.2). Remaining Studio form-filling tracked in [`RAPIDAPI.md`](RAPIDAPI.md).

---

## Phase 7: Platform Expansion

Extend the product's surface area so newcomers can use it where they expect to — phone first. Recurring feedback is that people expect a mobile app to try the product at all, so platform expansion is sequenced ahead of the go-to-market push (Phase 8): drive adoption onto surfaces newcomers can actually use before the marketing spend lands.

### 7.1 Mobile App (Cross-Platform)

**Decisions (2026-06-22):** React Native + Expo (managed) in TypeScript; consume `/api/v1` through a client **generated from the existing OpenAPI spec**; v1 ships the core read/track loop (browse + inventory + transactions), camera scanning is the fast-follow (7.3); launch iOS + Android together via EAS.

**Framework — React Native + Expo, not Flutter or bare RN.** One language across web/API/MCP/mobile, so the generated OpenAPI client and the sort/filter/legality enums are shared, not re-implemented. This is an API-driven CRUD + camera app (Expo's sweet spot), not a graphics showcase where Flutter's perf edge would pay off. EAS Build + OTA updates keep the toolchain manageable for a solo maintainer (no Mac/Xcode babysitting, JS fixes shippable without a store-review cycle). Escape hatch if a needed native module isn't in Expo: a dev-client + config plugins.

**Repo: [`i-want-my-mtg-mobile`](https://github.com/matthewdtowles/i-want-my-mtg-mobile)** (scaffolded 2026-06-22; browse + inventory + transactions + portfolio shipped, iOS live on TestFlight — see its `HANDOFF.md`) — Expo app. Reuses the running `/api/v1` backend with **no behavioral server changes.** The one server-side caveat: write endpoints' request DTOs needed `@ApiProperty` annotations so the generated client could type their bodies — without them the inventory POST/PATCH bodies generated as `string[]` (and DELETE had no body) per #549, and the transaction bodies generated as empty objects per #550; both are spec/annotation-only fixes. The same `@ApiProperty` / `ApiOkEnvelope` gap was then closed for the later features — buy-list (#557), notification + price-alert **responses** (#562), and price-alert **request** DTOs (#563) — unblocking [mobile #31](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/31) / [#32](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/32) / [#23](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/23). Auth is confirmed (below); CORS is a non-issue for native builds.

**Auth confirmed (2026-06-22) — no backend change needed.** `POST /api/v1/auth/login` already returns the JWT in the response body (`{ accessToken }`, `auth-api.controller.ts`), and the JWT strategy reads `Authorization: Bearer` first, cookie only as fallback (`jwt.strategy.ts`). So mobile captures the token at login, stores it in `expo-secure-store`, and sends it as a bearer header — the exact path the API/MCP clients already use.

**Backend enablers (landed since v1 shipped):** two opt-in server features were added to support the mobile experience without changing the core auth path above.
- [x] **Persistent login (refresh token)** — long-lived session so mobile users stay signed in (`refresh_token` table, #558, merged 2026-06-27).
- [x] **Push notifications** — device-token registration (`notification_device` table, `POST`/`DELETE /api/v1/notifications/devices`, #556) + **fan-out delivery via the Expo Push API** on alert firing (#560): `PushService` fans a push to the user's registered devices inside `PriceAlertService.processAlerts`, alongside the existing email, and prunes `DeviceNotRegistered` tokens. Client wires `expo-notifications` per [mobile #32](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/32) (device registration + tap-routing). The in-app inbox + unread badge shipped in [mobile PR #49](https://github.com/matthewdtowles/i-want-my-mtg-mobile/pull/49) against the typed `GET /notifications` + mark-read endpoints. (`expo-server-sdk` pinned to v5 — the CJS line; v6 is ESM-only and breaks the CommonJS Nest build.)

Stack:
- expo-router (file-based navigation), TanStack Query over the generated API client
- Auth: existing JWT as a bearer token, stored in `expo-secure-store` (confirmed working — see above)
- API client generated from the published OpenAPI spec, regenerated in CI when the spec changes (same source the MCP server consumes)
- Build/release: EAS Build (iOS + Android), EAS Update for OTA JS pushes

**v1 scope (first ship):**
- [x] Scaffold the Expo app in `i-want-my-mtg-mobile` (TypeScript, expo-router, TanStack Query)
- [x] Generate the typed API client from the OpenAPI spec; wire CI regeneration
- [x] Auth flow: sign in / sign up, capture `accessToken`, store in `expo-secure-store`, send as bearer header
- [x] Browse: sets + cards, card detail (reuse Scryfall images), card search
- [x] Inventory: view, add/edit quantities, finish toggle
- [x] Transactions: log buy/sell, view recent history
- [x] Portfolio overview (current value)
- [x] TestFlight (iOS) distribution - **done (2026-06-24)**: app builds on EAS and ships to TestFlight (mobile PR #18); see the mobile repo's README "Distribution"
- [ ] Play internal-testing (Android) distribution - **next**

**Fast-follow (after v1 validates):**
- [ ] Camera-based card scanning (7.3) — the "scan on phone, manage on web" differentiator; premium-gated per the Appendix
- [ ] Price alerts management ([mobile #32](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/32) — **in progress**, percent-threshold alerts off the now-typed `/price-alerts` DTOs), deck building ([mobile #23](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/23)), portfolio analytics parity
- [ ] App Store + Play Store public submission (see Store readiness below). iOS submission checklist tracked in [mobile #20](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/20)
- [ ] Market cross-platform sync as the core differentiator

**Store readiness (gates public submission — start the account/test items early, in parallel with the build):** the iOS App Store submission is broken into an ordered checklist in [mobile #20](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/20); the bullets below are the cross-platform context.

There is no general-audience sideloading on iOS, so reaching real users means going through Apple (TestFlight or App Store) and Google Play. The lead time here is calendar-bound, not code-bound — account enrollment, Google's new-individual closed-test gate, and first review can run 2–3 weeks of *waiting* — so the account/test items must start before the app is "done."

- [x] **Apple Developer Program** - enrolled (individual, 2026-06-24); App ID + App Store Connect app registered, TestFlight live
- [ ] **Google Play Developer** — $25 one-time; new individual accounts must run a **closed test with ~12 testers for 14 continuous days** before production is unlocked — start this clock early
- [ ] **Payments / store-cut decision (biggest policy risk):** premium is Stripe today, but Apple/Google require digital subscriptions sold *in-app* to use their IAP (15–30%). v1 has no billing UI, so launch posture is **read/track only — no upgrade button or web-purchase steering inside the app** (Apple polices external-purchase links). Decide and document this explicitly; native IAP + entitlement reconciliation is the alternative and is much larger.
- [ ] **Privacy disclosures:** Apple App Privacy questionnaire + Google Data Safety form (declare account email + JWT); reuse the existing `/privacy` URL (§3.2)
- [ ] **Account deletion** reachable in-app or clearly linked (both stores require it for apps with accounts) — confirm the §3.2 FK-cascade scrub is user-triggerable
- [ ] **Listing assets:** name, description, keywords, app icon, multi-size screenshots, Play feature graphic; content/age-rating questionnaires
- [ ] **If social login is ever added:** offering Google/any social sign-in forces **Sign in with Apple** alongside it — plain email/password (current) avoids this
- [ ] **Release pipeline:** EAS Build produces the signed `.ipa`/`.aab`; EAS Submit uploads to App Store Connect + Play Console (no local Xcode/Transporter). First submission and native changes go through full review (Apple ~1–3 days, Play hours–days); EAS Update ships JS-only fixes without re-review. **These are manual commands, run by hand** - merging to `main` only tags a version, it does **not** build or submit anything (no `eas` step in CI). And `eas submit` reaches **TestFlight / Play internal testing only**; a public store release is a separate, deliberate Submit-for-Review in App Store Connect / Play Console.

**Cross-repo tracking:** the mobile work lives in the `i-want-my-mtg-mobile` repo, but we want **one view of progress**. The v1 issues (#1–#8) live there and roll up on the **"I Want My MTG" GitHub project** (`PVT_kwHOAP2Yos4A4tP0`) alongside web, scry, and MCP — same pattern used for the cross-repo scry / MCP items. #1–#7 are done; **#8 distribution is in progress - iOS TestFlight shipped (2026-06-24), Android / Play internal is the remaining piece**. Its calendar-bound part — **store enrollment** — should be in flight while the app is still being built, not discovered at submission time: Apple's $99 enrollment (done) and Google's 14-day closed-test gate both have multi-day-to-week lead times.

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

## Phase 10: Architecture (remaining)

Completed Phase 10 sub-sections (10.2–10.7, 10.10) are condensed under **Done**; 10.1 (evaluate removing NestJS) was dropped — staying on NestJS. The items below are the open architecture work.

### 10.8 Scry: ingestion performance regression (scry#22)

Full ingest regressed from **3–4 min → ~27 min**; price ingest alone **~20s → ~18min**. Root cause: the granular per-vendor price store (scry#14) — 4 DB writes/batch (vs 1), dominated by `granular_price_history` (281s) + `granular_price` (264s).

**Investigation outcome (2026-06-18): don't optimize — cut.** Instrumentation (scry#23) + a prod-scale benchmark established that (a) plain INSERT is ~24× an `ON CONFLICT` upsert on the wide-key granular tables, but (b) the same trick is worthless on the narrow-key averaged tables (~10%). Then a usage audit + prod validation showed the granular store is mostly **dead weight**:

- `granular_price_history` is **write-only** — nothing reads it (web app, API, scry).
- ~82% of `granular_price` rows are **retail** (tcgplayer/CK/manapool) — **never read**; the web app only reads `granular_price` `WHERE price_type='buylist'`, vendor `cardkingdom`.
- The MTGJSON CK buylist it does write is **88% stale** (prod: only ~12% of the 17.8k MTGJSON-only rows were refreshed today; the rest froze days/weeks ago) and is fully covered by **CK-direct** (Tier B, live, with `qty`).

Decision: **go CK-direct-only for buylist; delete the rest.** Executed in §10.10. The tiered-optimization issues scry#24/#25/#26/#27/#31 are all **superseded/closed** by that cut. The one remaining ingest item was the ~3.5 min sealed `AllPrintings` re-stream (scry#28, originally scoped as a conditional-GET) - now solved by a **single pass** instead (below); scry#28 closed. Umbrella scry#22's price regression is resolved (granular cut verified 2026-06-20); it stays open only until the single-pass merges + deploys.

**Single-pass card + sealed ingest (2026-06-20) - solves the sealed re-stream, closes out scry#22.** Card ingest and sealed ingest both stream the same `AllPrintings.json` and just extract different sub-trees (`cards[]` vs `sealedProduct[]`), so it was being downloaded + tokenized twice. Built a single-pass "tee" on scry branch `perf/single-pass-card-sealed-ingest`: one `CardSealedEventProcessor` forwards each JSON event to both extractors (each tracks its own depth/skip state), driven by one stream. **Wired into the pipeline** - the default `ingest` (and any run requesting both cards + sealed) now uses it; `-c` / `--sealed` alone still run standalone. Also a standalone `ingest-cards-sealed` command. Local benchmark (release, dev DB): two-pass cards (230s) + sealed (210s) = **440s** vs single pass **206s** (~3.9 min saved). Full `scry ingest` end-to-end now **~4.4 min** (was ~27 min at the regression peak): sets + single-pass cards/sealed (206s, e.g. `Sealed products: 3675 -> 3773, 98 saved`) + prices (`granular_price=0/0`, CK-direct 74.8k rows) + prune + updates, exit 0. 116 lib tests pass (incl. a tee test). **Remaining:** merge the scry PR + deploy.

### 10.9 MCP: color breakdown + deck building parity (iwantmymtg-mcp#16)

MCP `get_portfolio_breakdown` enum is stale (offers a non-existent `format`, missing `color` + the `colors` filter), and there are **no deck tools** (generated API types predate `/api/v1/decks`). Regenerate API types, fix the breakdown dimensions, add the deck tool group.

### 10.11 Scry: card batch ingestion is serial despite Semaphore + spawn (scry#33 review)

PR #33 review (Copilot) correctly identified that `CardService::save_card_batch` acquires a semaphore permit and then immediately `.await`s the spawned task's join handle before returning. `JsonStreamParser::parse_stream` likewise awaits `on_batch` before advancing the stream. Result: `CONCURRENCY = 6` and the `Semaphore` add overhead with no benefit — batches are processed one at a time. Two options when this is revisited:

- **Simplify (recommended baseline):** remove the `tokio::spawn` + `Semaphore` entirely and run batch work inline. Equivalent behavior, honest code, no overhead.
- **Real concurrency:** restructure `parse_stream` to collect task handles (JoinSet) as the stream advances and join them after the stream ends, giving up to `CONCURRENCY` concurrent DB writes.

Not blocking the single-pass PR (#33) — the serial pattern predates it and throughput is acceptable post-10.10.

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

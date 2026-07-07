# Codebase Analysis — Bugs, Inconsistencies & Recommendations

**Date:** 2026-07-07
**Scope:** Full `src/` tree (~32k lines TS), configs, tests. Verified against `npx tsc --noEmit` (clean) and `npm test` (113 suites / 1366 tests, all passing — with a leaked-handle warning, see [C7](#c7-jest-worker-leaked-handle-warning)).

Each finding lists severity, location, the problem, and a recommended fix. Severity scale:
**🔴 High** = user-visible wrong behavior or data-integrity risk · **🟠 Medium** = latent bug, security/perf concern · **🟡 Low** = maintainability / consistency.

---

## Part 1 — Bugs (correctness)

### B1. Error-to-HTTP mapping is keyword matching on error message strings 🔴

`src/http/http.error.handler.ts:20-35` maps exceptions to HTTP statuses by substring-matching `error.message` (`includes('not found')` → 404, `includes('invalid')` → 400, else 500). Every HBS orchestrator (46 call sites) funnels errors through it. This produces concrete wrong results today:

1. **401s become 404s.** `HttpErrorHandler.validateAuthenticatedRequest` throws `UnauthorizedException('User not found in request')` *inside* orchestrator `try` blocks (e.g. `set.orchestrator.ts:309`). The catch passes it to `toHttpException`, which matches `'not found'` **first** and rethrows it as `NotFoundException` — an unauthenticated POST gets 404 instead of 401, so the exception filter never sets `returnUrl` for the login redirect (`http.exception.filter.ts:52`).
2. **User-input errors become 500s.** `TransactionService` throws `Error('Cannot sell 5 units. Only 3 remaining.')` — no keyword matches, so a routine over-sell attempt surfaces as `500 An unexpected error occurred` through the HBS flow, and as a raw 500 through the API controllers, which don't catch it at all (`transaction-api.controller.ts` `create`/`update` have no try/catch and no filter maps generic `Error` → 4xx).
3. **Infrastructure errors become 400s.** Postgres messages like `invalid input syntax for type uuid` contain `'invalid'` → the client is told its request was bad when the server broke.
4. The service layer *wraps* every error (`throw new Error(\`Error finding cards…: ${error.message}\`)`), so whether a page 404s or 500s depends on the wording of a message two layers down. The mapping is load-bearing prose.

**Recommendation.** The codebase already contains the right building blocks — `src/core/errors/domain.errors.ts` (`DomainNotFoundError`, `DomainNotAuthorizedError`, `DomainValidationError`), used correctly by the newer `price-alert` / `api-tier` modules and `mcp.error.ts`. Make that the single convention:

- In `toHttpException`: first `if (error instanceof HttpException) throw error;` then map `instanceof Domain*Error` to the matching HTTP exception; delete the keyword matching.
- Migrate core services to throw `Domain*Error` (e.g. `DomainValidationError('Cannot sell…')`, `DomainNotFoundError('Set with code X not found')`).
- Add a mapping for `Domain*Error` in the global `HttpExceptionFilter` so API controllers get correct statuses without per-controller catches (the per-controller `instanceof` blocks in `api-key-api.controller.ts` / `price-alert-api.controller.ts` can then be deleted).

### B2. `InventoryRepository.ensureAtLeastOne` always reports 0 saved 🔴

`src/database/inventory/inventory.repository.ts:248-257` runs a raw `INSERT … ON CONFLICT DO NOTHING` via `repository.query()` and reads `result?.rowCount`. Verified against the installed TypeORM 0.3.26 (`PostgresQueryRunner.query`): for an `INSERT`, `query()` returns `raw.rows` — a plain array with **no `rowCount` property**. So `saved` is always `0` and `skipped` is always `items.length`. Any CSV import row without a quantity ("ensure at least one") is persisted correctly but reported to the user as skipped.

**Fix.** Append `RETURNING card_id` and use `result.length`, or call through a query runner with `useStructuredResult = true` and read `.affected`. Add an integration-test assertion on the returned counts (the current tests only assert DB state).

### B3. Fire-and-forget delete inside `InventoryService.save` 🔴

`src/core/inventory/inventory.service.ts:28-36`:

```ts
} else {
    // await omitted intentionally
    this.repository.delete(item.userId, item.cardId, item.isFoil);
}
```

Two problems: (1) if the delete rejects, nothing handles it — an unhandled promise rejection **terminates the Node process** on Node ≥ 15; (2) callers (`TransactionService.adjustInventory`, quantity updates from the UI) get a success response before the delete has happened, and a failed delete is silent data corruption (transaction ledger says sold-out, inventory row still shows copies). `await` it — the latency of one indexed `DELETE` is not worth a crash vector. If batching matters, collect keys and issue one `DELETE … WHERE (user_id, card_id, foil) IN (…)`.

### B4. Ledger writes and inventory sync are not transactional 🟠

`TransactionService.create/update/delete` (`src/core/transaction/transaction.service.ts:67-80, 172-186, 210-215`) persist the transaction row, then adjust inventory in a separate call. A failure between the two leaves the ledger and inventory permanently inconsistent (there is no reconciliation job). Same shape in `DeckImportService.importDecklist` (deck created, then cards added) and `InventoryImportService` (deletes, saves, ensures as separate steps).

Additionally, the sell-validation is check-then-act: `getRemainingQuantity()` then `save()` — two concurrent SELL requests can both pass validation and oversell (`create`, lines 55-66).

**Recommendation.** Introduce a unit-of-work port in `src/core` (e.g. `TransactionRunnerPort` with `run<T>(fn): Promise<T>`) implemented in `src/database` over TypeORM's `DataSource.transaction()`, and wrap ledger + inventory mutation in it. That keeps the hexagonal direction intact. The oversell race then closes for free if the remaining-quantity read happens inside the same transaction (with `SELECT … FOR UPDATE` or a serializable isolation level).

### B5. Postgres pool configured with MySQL options — pool limits are inert 🟠

`src/app.module.ts:36-40` (both branches):

```ts
extra: { connectionLimit: 10, queueLimit: 0, waitForConnections: true },
```

These are **mysql2** pool options. `extra` is passed to `pg.Pool`, which ignores all three (its knobs are `max`, `idleTimeoutMillis`, `connectionTimeoutMillis`). The app currently runs on pg's defaults (`max: 10`) by coincidence; the queue behavior you think you configured does not exist. Replace with `extra: { max: 10 }` (plus explicit timeouts), and delete the duplicated TypeORM config block by extracting a single factory that takes `url | host-parts` (the two branches differ only in connection fields but duplicate logging/ssl/extra).

### B6. Dead `CardRepository.totalValueForSet` contains an inverted filter 🟠

`src/database/card/card.repository.ts:170-192` — `AND c.in_main = $2` bound to `baseOnly`. With `baseOnly = false` this filters to **only non-main cards** instead of *all* cards. The method is not on `CardRepositoryPort` and has no callers (the live path is `SetRepository.totalValueForSet`, which reads precomputed `set_price` columns). Delete it (and its tests); if it's ever needed, the filter must become `($2 = false OR c.in_main = true)`.

### B7. In-page filter and search sanitize differently — apostrophe cards unfindable via filter 🟠

`safeAlphaNumeric` (`src/core/query/query.util.ts:17-21`) strips `'`, `,`, `.` etc., and is what `SafeQueryOptions.filter` uses; `safeSearchTerm` (line 24) deliberately allows `-',.;:/`. Consequence: typing `Urza's` into a set page's filter box sends fragment `Urzas`, and `ILIKE '%Urzas%'` matches nothing — cards named with apostrophes/commas (a large chunk of MTG) can't be filtered, while the same text works in the search bar. Align `filter` on `safeSearchTerm`'s character set (parameterized ILIKE already makes the extra characters safe).

### B8. No upper bound on `limit` — unbounded page sizes on public endpoints 🟠

`sanitizeInt` (`query.util.ts:9-14`) rejects values `< 1` but has **no maximum**, and `SafeQueryOptions` applies it everywhere. Only the price-alert controllers clamp locally (`Math.min(100, …)`, `price-alert-api.controller.ts:64`). Every other list endpoint — `/sets`, set card pages, search, inventory, transactions, the public RapidAPI card search — accepts `?limit=1000000` and will happily build a giant join. The burst rate-limit guard does not help; a handful of such requests saturates Postgres. Add a cap in one place (`sanitizeInt(value, default, max = 100)` or a clamp in the `SafeQueryOptions` constructor) rather than per-controller.

### B9. Global exception filter leaks internal error details 🟠

`src/http/http.exception.filter.ts:33-53` — for non-`HttpException` errors (i.e., genuine 500s), the response body/toast is `exception.message`: raw TypeORM/Postgres messages (table/column names, constraint names) or whatever an internal `Error` said, sent to API clients and rendered into error-page toasts. For status ≥ 500, respond with a generic message and keep the detail in the log (the correlation-id infrastructure already exists to tie them together).

### B10. Signup reveals which emails are registered 🟡

`user.orchestrator.ts:80-83` throws `'A user with this email already exists'` while unknown emails proceed to "check your email" — a classic account-enumeration oracle, compounded by a timing oracle in `AuthService.validateUser` (`auth.service.ts:22-24`: no bcrypt compare at all when the email is unknown, so unknown-email logins return measurably faster). Recommendation: return the same "check your email" response whether or not the account exists (optionally emailing "you already have an account" instead), and do a dummy bcrypt compare on unknown emails.

### B11. `bootstrap()` is a floating promise 🟡

`src/main.ts:113` — `bootstrap();` with no `.catch`. Startup failures (`assertProdEnv`, port in use) surface as unhandled rejections. Use `bootstrap().catch((err) => { console.error(err); process.exit(1); })`. An ESLint `no-floating-promises` rule would have flagged both this and B3 — see C2.

### B12. Set page runs inventory SQL for anonymous users, and an O(n²) map rebuild 🟡

`set.orchestrator.ts` `createSetResponseDto`:
- Lines 691, 702 call `totalInventoryItemsForSet(userId, …)` / `ownedValueForSet(userId, …)` unconditionally — with `userId = 0` for anonymous visitors, issuing two pointless queries on one of the highest-traffic pages (and sequentially, not `Promise.all`).
- Line 713: `InventoryPresenter.toQuantityMap(inventory)` is invoked **inside** `set.cards.map(...)` — the quantity map is rebuilt for every card. For a 700-card set with a large collection this is O(cards × inventory). Hoist it above the `.map`.

### B13. Stripe webhook sync trusts event payloads blindly on two axes 🟡

`subscription.service.ts:113` casts `stripeSub.status as SubscriptionStatus` unvalidated (an unrecognized status string is persisted and will make `isActive()` behave arbitrarily), and `syncFromStripeSubscription` has no defense against **out-of-order webhook delivery** (an older `customer.subscription.updated` arriving after a newer one regresses the row — Stripe explicitly does not guarantee ordering). Validate the status against the enum, and either compare event `created` timestamps before writing or re-fetch the subscription from the API (as `syncFromCheckoutSessionId` already does).

### B14. Minor defects

| Where | Issue |
|---|---|
| `src/shared/decorators/timing.decorator.ts:16` | Log template typo: `[$class.$method)}]`. Also forces every wrapped method async. |
| `src/http/base/http.util.ts:7` (`toDollar`) | `if (amount)` — `0` renders `'-'` while `0.001` renders `'$0.00'`; negatives render `'$-3.99'`. Use explicit `amount == null` checks; `formatChange`-style sign handling belongs inside. |
| `src/core/auth/jwt.strategy.ts:104` | `parseInt(payload.sub)` without radix (radix-10 given everywhere else). |
| `app.config.ts` hbs helpers | `toUpperCase`/`capitalize` throw on non-string/undefined input → template render becomes a 500. Guard like `money` does. |
| `set.controller.ts:88-91` | `days` has no upper clamp (`?days=99999999` → full-history scan). Clamp like the orchestrator clamps rows elsewhere. |
| `jwt.strategy.ts:validate` | A DB `findById` on **every** authenticated request. Fine at current scale, but worth noting: the JWT already carries `email`/`role`; consider trusting the (60-min) token and reserving the DB read for sensitive routes. |

---

## Part 2 — Architecture & hexagonal inconsistencies

### A1. Three competing error conventions in `src/core` 🔴 (root cause of B1)

- Plain `Error` with keyword-significant messages: `card.service.ts` (14×), `transaction.service.ts` (12×), `set.service.ts`, `user.service.ts`, `auth.service.ts`…
- `Domain*Error`: `price-alert`, `api-tier` (the newer, better pattern).
- **NestJS HTTP exceptions thrown from the domain layer**: `deck.service.ts` imports `BadRequestException`/`NotFoundException` from `@nestjs/common` — HTTP concerns inside core, which inverts the port-adapter direction the rest of the codebase carefully maintains.

Standardize on `Domain*Error` in core (add `DomainConflictError` if needed), and map once at the boundary (see B1). `deck.service.ts` is a mechanical migration.

### A2. Catch-wrap-rethrow boilerplate in every service method 🔴

The dominant service pattern (`CardService`, `SetService`, and others) is:

```ts
try {
    return await this.repository.x(...);
} catch (error) {
    throw new Error(`Error doing x: ${error.message}`);
}
```

This (a) **destroys the stack trace and error type** — the original error class, code, and stack are gone by the time anything logs it; (b) is why B1's string matching exists; (c) adds ~6 lines of noise per method — `CardService` is 195 lines of which maybe 60 do work. Remove the try/catch entirely (let errors propagate; the global filter logs them with stack via `exception.stack`), or where context genuinely helps, use `throw new DomainXError(msg, { cause: error })` so the chain is preserved.

### A3. `BaseRepository` hard-codes card-table queries into every repository 🟠

`src/database/base.repository.ts` gives *every* repository (`SetRepository`, `InventoryRepository`, …) `totalCards()` / `totalCardsInSet()` that run `SELECT COUNT(*) FROM card` — regardless of the repository's own table. Downstream this produces the genuinely confusing `InventoryService.totalCards()` ("Get total number of cards in existence") which returns the **catalog** size through the inventory port (used by `inventory.orchestrator.ts:77`). Move these two queries to `CardRepository` (where a `totalCards` belongs), expose them via `CardService`, and delete `BaseRepository`/`BaseRepositoryPort` — with the card queries gone, the base class holds only three string constants.

### A4. Dead port surface & dead code 🟠

- `CardRepositoryPort.save`, `.delete`, `.findById`, `.deleteLegality` — no callers anywhere in the app (writes happen in the external Scry ETL). ~120 lines of implementation + port docs + tests maintained for nothing, and `save`/`delete` on the web app's port is a standing invitation to bypass the ETL. Remove them.
- `CardRepository.totalValueForSet` — dead and buggy (B6).
- `UserOrchestrator.create` — the controller only uses `initiateSignup` (email-verification flow); the direct-create path is unreachable legacy.
- `CardRepository.findById(uuid, _relations)` — parameter named `_relations` (the "unused" convention) but it *is* used; rename to `relations`.

### A5. Non-domain data smuggled through entities via `as any` 🟠

`transaction.orchestrator.ts:62` and `transaction-api.presenter.ts:8` do `const tx = t as any;` to read `cardName`, `cardSetCode`, `cardImgSrc` that the repository glued onto `Transaction` beyond its declared type. This defeats the whole mapper/entity discipline: the fields are invisible to the type system, unmapped, and each consumer re-discovers them by cast. Define an explicit read model (`TransactionWithCard`) returned by a dedicated repository method, and map it like everything else.

Related: domain entities are documented as immutable value objects, but `set.orchestrator.ts:220` mutates one (`set.cards.push(...cards)`). Prefer building the view from `set` + `cards` as separate inputs.

### A6. The latest-price join subquery is copy-pasted 7× 🟡

`'prices.date = (SELECT MAX(p2.date) FROM price p2 WHERE p2.card_id = card.id)'` appears in `card.repository.ts` (5×) and `inventory.repository.ts` (+ the raw-SQL variant in 3 aggregate queries). One drift and "latest price" means different things on different pages. Extract a constant/helper next to `QueryBuilderHelper` (e.g. `latestPriceJoin(cardAlias)`), and consider replacing the correlated subquery with a `LATERAL` join or a `latest_price` view for performance on big sets.

### A7. Two sources of truth for "how many cards are in this set" 🟡

`CardRepository.totalInSet` (counts rows with filters) vs `SetRepository.totalInSet` (returns stored `baseSize`/`totalSize`). `SetOrchestrator` picks one or the other depending on whether a filter is present (`findBySetCode`, `getLastCardPage`). If MTGJSON's stored sizes ever disagree with actual card rows, pagination totals and displayed counts diverge on the same page. At minimum, document the invariant; better, always count when correctness matters and reserve the stored sizes for the completion-rate denominator.

### A8. Controller/orchestrator responsibility drift 🟡

The documented rule is "view assembly in orchestrators; controllers thin". Mostly true, but controllers mutate view DTOs after the fact (`set.controller.ts:60-65, 124-128` set `title`, `metaDescription`, `canonicalUrl`, `ogImage`), and `SetOrchestrator.createSetPriceDto` is a 110-line formatting method (with three inline closure helpers) that is presenter work — `CardPresenter`/`SealedProductHbsPresenter` already establish the right home. Also inconsistent: `transaction.orchestrator.ts:79` calls `req.isAuthenticated()` directly while everything else uses the `isAuthenticated(req)` helper. Pick one (the helper) and move SEO fields into the orchestrator's DTO construction.

### A9. Orchestrators `return` a function that never returns 🟡

`return HttpErrorHandler.toHttpException(error, 'ctx')` — the method is typed `never` and always throws, so the `return` is a fiction that makes the code read as if an error page DTO comes back. Write `throw`-free style: `HttpErrorHandler.toHttpException(error, 'ctx');` as a statement, or once A1/A2 land, delete most of these catch blocks entirely.

### A10. `await import('../inventory.entity')` mid-method 🟡

`inventory-import.service.ts:127` dynamically imports the `Inventory` entity inside the import loop — presumably a circular-dependency workaround. It's the only dynamic import in the codebase, invisible to refactoring tools. Break the cycle properly (the entity could live in a types-only module) and use a static import.

---

## Part 3 — Performance

### P1. Per-row card resolution in imports (N+1 at scale) 🟠

`InventoryImportService.importCards` and `DeckImportService.importDecklist` `await this.cardResolver.resolveCard(row)` **sequentially per row**, with `MAX_IMPORT_ROWS = 2000` — a worst-case import issues 2000+ serial queries inside one HTTP request (minutes of wall time, one connection pinned). Batch it: group rows by resolution strategy (id / set+number / name) and resolve each group with one `IN (…)` query; `verifyCardsExist` already shows the batched pattern. Same for `DeckBuildabilityService.addMissingToBuyList` (`deck-buildability.service.ts:53-56`) — one `buyListService.add` await per missing card.

### P2. `getRemainingQuantity` loads full transaction history to compute a sum 🟡

`transaction.service.ts:224-232` fetches all buy lots and all sells for a card and reduces in JS on every create/update/delete. A single `SELECT COALESCE(SUM(CASE WHEN type='BUY' THEN quantity ELSE -quantity END),0)` does it in one round trip. (Bundling it inside the B4 transaction makes this the natural moment to fix.)

### P3. Sequential awaits where `Promise.all` fits 🟡

`createSetResponseDto` (B12), `SubscriptionService.getOrCreateCustomer` (two lookups), `AuthService.refresh`. The codebase uses `Promise.all` well elsewhere (`findFlatSetList`, transaction API `findAll`) — apply it consistently.

---

## Part 4 — Configuration, tooling, tests

### C1. TypeScript strictness is off 🔴 (highest-leverage long-term fix)

`tsconfig.json`: `strictNullChecks: false`, `noImplicitAny: false`. This is why `let user: User = null` (auth.service), `toValidNumber(value: any)`, and the `as any` smuggling (A5) compile silently, and why the mapper layer can't guarantee what it promises. Migrate incrementally: enable `strict` in a `tsconfig.strict.json` used by CI on a growing include list, or flip `strictNullChecks` on and fix the ~few-hundred errors module by module (start with `src/core`, where the domain invariants matter most).

### C2. ESLint has no type-aware rules 🟠

`.eslintrc.json` uses only the syntactic `recommended` sets. Adding `plugin:@typescript-eslint/recommended-type-checked` (or at minimum `@typescript-eslint/no-floating-promises` + `no-misused-promises` with `parserOptions.project`) would have caught B3 and B11 mechanically. Also consider raising `no-explicit-any` from `warn` to `error` once A5 is fixed (only 6 `as any` sites remain).

### C3. Duplicated formatting logic across server and client 🟡

`toDollar` + thousands-separator regex exists in `src/http/base/http.util.ts`, again in `set.orchestrator.ts` `formatChange`, and again in `src/http/public/js/ajaxUtils.js` — with already-divergent behavior (client returns `'-'` for `0`, server helper `money` in `app.config.ts` returns `'—'`, `toDollar` returns `'-'`). Server-side: collapse to one util (and prefer `Intl.NumberFormat('en-US', { style: 'currency' })` over the regex). Client-side duplication is inherent to the SSR+AJAX split, but the AJAX endpoints could return pre-formatted strings from the same server util (several already do), letting `ajaxUtils.toDollar` shrink or disappear.

### C4. Logging conventions 🟡

- Orchestrator catches log real failures at `debug` level (`this.LOGGER.debug(\`Error finding list of sets…\`)`) — invisible in production (`error`-only logging). Errors that reach `toHttpException` get logged there at `error`, but the several `catch → return []` paths (e.g. `findSealedProductsForSet`) hide failures at `debug`. Use `warn`/`error` for caught failures.
- Nearly every repository/service method logs entry + exit at `debug` (two lines per call, ~500 sites). Since `TimingDecorator` exists for the timing use case and correlation IDs exist for tracing, consider trimming exit logs; it's a lot of hand-maintained noise (several already drifted, logging wrong method names).

### C5. Verification/reset tokens stored in plaintext while refresh tokens are hashed 🟡

`RefreshTokenService` deliberately stores only SHA-256 hashes (well done, including atomic rotation). But `pending_user` verification tokens (`verification-token.util.ts` + `pendingUserService.findByToken`) — and password-reset tokens, which share the util — are stored and looked up raw. A DB read (backup leak, SQLi elsewhere) yields live account-takeover tokens. Same fix as refresh tokens: store `sha256(token)`, look up by hash. Low effort, consistent policy.

### C6. In-memory rate limiting & upload tracking pin the app to one instance 🟡

`ApiRateLimitGuard` and `upload-rate-limit.guard.ts` keep state in process-local `Map`s. Correct today (single Lightsail box), but it's an undocumented scaling constraint — a second instance silently doubles every limit. A one-line comment on each guard (and a ROADMAP note to move to Postgres/Redis when scaling) is enough for now; the daily quota is already DB-backed and fine.

### C7. Jest worker leaked-handle warning 🟡

`npm test` passes but ends with "A worker process has failed to exit gracefully… Active timers can also cause this". Something under test starts a timer without `unref` (the `ApiRateLimitGuard` interval *is* unref'd; likely another `setInterval`/`setTimeout` in a service or a test missing teardown). Run `jest --detectOpenHandles` once and fix; leaked handles eventually mask real hangs in CI.

### C8. Test coverage skew 🟡

113 unit suites and a strong integration suite, but only 9 of 17 HBS orchestrators have specs — and the orchestrators contain exactly the logic that has bugs in this report (B1, B12, `createSetPriceDto` dedup cascade). When A8 moves formatting into presenters, add presenter specs; pure functions there are cheap to test.

---

## Part 5 — Things that are in good shape (keep doing these)

Worth stating so the fixes above don't read as a verdict on the whole codebase:

- **Port-adapter discipline is real**: services depend on `*RepositoryPort` tokens, DI bindings live in `DatabaseModule`, mappers isolate ORM entities. Violations (A1/A5) are the exception, not the rule.
- **SQL injection posture is good**: user input consistently goes through parameter binding; the `QueryBuilderHelper` `allowedSorts` allowlist + `resolveSort` design (with the fail-fast constructor check) is a genuinely nice solution to the ORDER-BY-injection/unjoined-alias class of bugs.
- **`RefreshTokenService`** — hashed storage, atomic single-use rotation with race handling, revoke-before-password-write ordering in `UserService.updatePassword` — is textbook.
- **`validateApiQuery`** (strict 400s for API, lenient fallbacks for HBS bookmarks) is a thoughtful split, well documented, and derives its allowed values from the same enums the sanitizers use.
- **Pure pricing policies** (`buylist.policy.ts`, `cash-vs-credit.policy.ts`, `sell-value.policy.ts`) are exactly where that logic should live — pure, documented, testable.
- Auth cookies are `httpOnly` + `sameSite=lax` + `secure` in prod; Stripe webhook raw-body scoping in `main.ts` is done correctly; Handlebars escaping is relied on properly (the only `{{{ }}}` sites are JSON-LD and server-rendered markdown).

---

## Suggested fix order

| Priority | Items | Rationale |
|---|---|---|
| 1 | B1 + A1 + A2 (error handling overhaul) | One coherent refactor; removes the largest bug class and ~500 lines of boilerplate. |
| 2 | B3, B2, B4 (inventory/ledger integrity) | Data-integrity and crash risks in the money paths. |
| 3 | B7, B8, B12, B5 (user-visible / capacity) | Small, independent, high user impact. |
| 4 | C1 + C2 (strictness & lint) | Prevents regressions of everything above. |
| 5 | A3–A10, P1–P3, C3–C8 | Steady-state cleanup; each is an afternoon or less. |

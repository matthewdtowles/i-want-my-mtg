# Plan: In-app MCP endpoint (streamable HTTP) for Smithery scanning

**Status:** Ready to execute. This branch (`plan/mcp-streamable-http-endpoint`) contains only this
document. Implement on top of it.

**Repo to change:** `i-want-my-mtg` (this repo).
**Sibling reference repo:** `iwantmymtg-mcp` — the existing stdio MCP server. Its
`src/tools/*.ts` files are the **source of truth for the tool contract** (names, descriptions,
input schemas). Copy those verbatim; only the *execution* differs here.

---

## 1. Why we're doing this

Smithery's **Capability Quality** score (0/40 today, shown as "0/0 tools") is computed by Smithery
**connecting to the server and calling `tools/list`**. It can only do that for a server it can reach
over the wire — i.e. a **Hosted/Remote (streamable HTTP)** listing.

Our current Smithery listing is **Local (stdio + MCPB)**: Smithery hands the `npx`/bundle to end
users to run on *their* machines and never executes it itself, so it sees zero tools → 0/40. This is
a deployment-model limitation, **not** a quality problem — the 33 tools in `iwantmymtg-mcp` already
have excellent descriptions, parameter descriptions, and naming.

The fix: expose the **same 33 tools** as a streamable-HTTP MCP endpoint **inside this NestJS app**,
as a new driving (primary) adapter next to `src/http/`. Smithery then connects to
`https://iwantmymtg.net/mcp`, scans the tools, and Capability Quality populates.

### Why in-app and not a standalone hosted wrapper
- An MCP endpoint is just another **driving adapter** over the existing `core/*` services — no
  business logic is rebuilt.
- Per-user auth, rate limiting, and premium gating are **inherited** from existing guards instead of
  re-solved. A standalone wrapper would have to re-implement "which user is this, what are their
  limits"; in-app, that problem never appears.
- The stdio `iwantmymtg-mcp` package stays as-is (a separate Local listing / local install). The two
  are different windows into the same backend. Sharing the tool *contract* as a published package is
  a nice later refactor but **out of scope here**.

---

## 2. Success criteria (verifiable)

1. `POST https://iwantmymtg.net/mcp` speaks MCP streamable HTTP: `initialize` + `tools/list` returns
   **33 tools** with descriptions, parameter descriptions, and snake_case names.
2. Read-only tools (cards/sets/prices) work **with no API key**.
3. Collection tools (inventory/transactions/portfolio/alerts/notifications) require a valid
   `iwm_live_...` key and operate **only on that key's user**. No key → clean MCP error, not a crash.
4. Premium-gated portfolio tools enforce the same premium check the REST endpoints do.
5. Existing REST API and web routes are **unchanged** (regression check).
6. After deploy, the Smithery listing's Capability Quality is > 0 (target: descriptions + parameter
   descriptions + naming ≈ 24/40 immediately; output schemas + annotations are a follow-up, §8).

---

## 3. Architecture

New module: `src/mcp/` (driving adapter), wired into `AppModule` (or `HttpModule`).

```
HTTP client / Smithery ──POST /mcp──▶ McpController (Nest, reuses guards)
                                          │ builds per-request MCP Server
                                          ▼
                                    McpToolRegistry (33 tools)
                                          │ each handler calls…
                                          ▼
                                    core/* services + existing presenters
                                          ▼
                                    database adapters (unchanged)
```

**Transport mode: stateless.** Create a fresh `StreamableHTTPServerTransport` **per request** with
`sessionIdGenerator: undefined` (no sessions), connect a fresh `Server`, handle, then close on
response end. Our tools are a simple request/response model; stateless avoids session storage and
matches what Smithery's scan needs. (GET/DELETE on `/mcp` → 405 in stateless mode.)

**Per-request user context.** The route guard authenticates and sets `req.user`
(`AuthenticatedRequest`). Because the `Server` is built **inside** the controller method per request,
each tool handler closes over that request's `user` (or `undefined` for anonymous read-only). Never
read a global key.

---

## 4. Dependencies

Add to `package.json`:
- `@modelcontextprotocol/sdk` (^1.x) — the `Server`, `StreamableHTTPServerTransport`, and request
  schemas.
- `zod` (^3.x) **and** `zod-to-json-schema` (^3.x) — only if we reuse the zod input schemas from
  `iwantmymtg-mcp` verbatim (recommended, keeps contracts identical). Alternatively hand-write JSON
  Schema and skip zod; reusing zod is less error-prone.

These are isolated to `src/mcp/`; nothing else in the app uses zod (the REST side uses
class-validator — leave it alone).

---

## 5. Files to create

| File | Responsibility |
|---|---|
| `src/mcp/mcp.module.ts` | Nest module. Imports the core feature modules (Card, Set, SealedProduct, Inventory, Transaction, Portfolio, PriceAlert, PriceNotification) so their services inject. Declares `McpController`, `McpServerFactory`, and the tool registry. |
| `src/mcp/mcp.controller.ts` | `@Controller('mcp')`. `@Post()` handler guarded by `OptionalAuthOrApiKeyGuard` + `ApiRateLimitGuard`. Builds the per-request server + stateless transport and delegates. `@Get()`/`@Delete()` → 405. |
| `src/mcp/mcp-server.factory.ts` | `build(user?: AuthenticatedUser): Server`. Registers `ListToolsRequestSchema` (maps the registry to `{name, description, inputSchema}`) and `CallToolRequestSchema` (validates args, enforces `requiresAuth`/premium, runs the handler, returns `content: [{type:'text', text: JSON.stringify(result)}]`, formats errors as `isError`). |
| `src/mcp/tools/registry.ts` | The 33 tool definitions: `{ name, description, inputSchema, requiresAuth, premium?, handler(ctx) }`. `ctx = { user, services }`. |
| `src/mcp/tools/*.ts` | One file per domain (cards, sets, inventory, transactions, portfolio, alerts, notifications), mirroring `iwantmymtg-mcp/src/tools/*`. Handlers call the same core service + presenter the matching REST controller uses. |
| `src/mcp/mcp.error.ts` | Small helper to turn thrown domain errors into MCP `isError` text results (mirror `iwantmymtg-mcp/src/error-formatter.ts`). |

Wire `McpModule` into `AppModule.imports` (or `HttpModule`).

---

## 6. The key simplifying principle: every tool already has a REST twin

Do **not** invent service calls. Every MCP tool corresponds 1:1 to an existing endpoint in
`src/http/api/*`. For each tool: open the matching `*-api.controller.ts`, and have the MCP handler
call the **same service method(s) and the same presenter**. The controllers already handle pagination
meta, premium checks, and presentation.

### Tool → core service / REST controller map

Read-only — guard `OptionalAuthOrApiKeyGuard`, `requiresAuth: false`:

| Tool | Core call(s) | REST twin |
|---|---|---|
| `search_cards` | `CardService.searchByName` + `totalSearchByName`; `CardApiPresenter` | `CardApiController.search` |
| `get_card` | `CardService.findBySetCodeAndNumber`; `CardApiPresenter` | `CardApiController.findBySetCodeAndNumber` |
| `get_card_prices` | `findBySetCodeAndNumber` + `findByIdsWithPrices` | `CardApiController.getPricesBySetCodeAndNumber` |
| `get_card_price_history` | `findBySetCodeAndNumber` + `findPriceHistory` | `CardApiController.getPriceHistoryBySetCodeAndNumber` |
| `search_sets` | `SetService.searchSets` + `totalSearchSets` | Set API controller (search) |
| `get_set` | `SetService.findByCode` | Set API controller (by code) |
| `list_set_cards` | `CardService.findBySet` + `CardService.totalInSet` | Set/Card API controller (cards in set) |
| `get_sealed_products` | `SealedProduct` service (`src/core/sealed-product`) | Sealed-product API controller |

Auth-required — guard `JwtOrApiKeyGuard`, `requiresAuth: true`, `user.id` from `req.user`:

| Tool | Core call(s) | REST twin |
|---|---|---|
| `list_inventory` | `InventoryService.findAllForUser` + `totalInventoryItems`; `InventoryApiPresenter` | `InventoryApiController` (list) |
| `get_inventory_quantities` | `InventoryService.findByCards` → `InventoryQuantityApiDto` | Inventory quantities endpoint |
| `add_inventory` | build `Inventory[]`, `InventoryService.save` | Inventory POST |
| `update_inventory` | `InventoryService.save` | Inventory PATCH |
| `remove_inventory` | `InventoryService.delete` | Inventory DELETE |
| `list_transactions` | `TransactionService.findByUserPaginated` + `countByUser` | Transaction API (list) |
| `record_transaction` | `TransactionService.create` | Transaction POST |
| `update_transaction` | `TransactionService.update` | Transaction PATCH |
| `delete_transaction` | `TransactionService.delete` | Transaction DELETE |
| `get_cost_basis` | `TransactionService.getCostBasis` | Cost-basis endpoint |
| `get_portfolio_summary` | Portfolio service summary | Portfolio API (summary) — **premium** |
| `get_portfolio_history` | `PortfolioService.getHistory` | Portfolio history — **premium** |
| `get_card_performance` | Portfolio/transaction perf method | **premium** |
| `get_cash_flow` | `TransactionService.getCashFlow` | Cash-flow endpoint |
| `get_realized_gains` | Portfolio realized-gains method | **premium** |
| `get_portfolio_breakdown` | Portfolio breakdown method | **premium** |
| `refresh_portfolio` | Portfolio refresh method | **premium** |
| `list_alerts` | `PriceAlertService.findByUserWithCardData` + `countByUser` | Price-alert API (list) |
| `create_alert` | `PriceAlertService.create` | Price-alert POST |
| `update_alert` | `PriceAlertService.update` | Price-alert PATCH |
| `delete_alert` | `PriceAlertService.delete` | Price-alert DELETE |
| `list_notifications` | `PriceNotificationService` (list) | Notification API (list) |
| `get_unread_count` | `PriceNotificationService` (unread count) | Notification unread-count |
| `mark_notification_read` | `PriceNotificationService` (mark read) | Notification mark-read |
| `mark_all_notifications_read` | `PriceNotificationService` (mark all) | Notification mark-all |

> Confirm exact portfolio method names against `src/core/portfolio/portfolio.service.ts` and the
> portfolio REST controller while implementing — that service file is larger than the others; only
> `getHistory` was sampled during planning. Premium gating: mirror whatever guard/check the portfolio
> REST controller uses (likely a subscription/premium guard or a `core/subscription` check).

---

## 7. Auth, transport, and bootstrap notes (gotchas)

- **Body parsing.** `src/main.ts` runs with `bodyParser: false` then applies a **global
  `express.json()`**, so `req.body` is already-parsed JSON by the time the controller runs. Pass it
  explicitly: `await transport.handleRequest(req, res, req.body)`. Do **not** try to re-read the raw
  stream.
- **Accept header.** MCP clients send `Accept: application/json, text/event-stream`. The transport
  handles content negotiation; in stateless mode it responds with a single JSON-RPC body.
- **Guard choice on `/mcp`.** Use `OptionalAuthOrApiKeyGuard` (not `JwtOrApiKeyGuard`) so anonymous
  read-only calls are allowed and `req.user` is populated when a key is present. Enforce auth
  **per-tool** inside `CallTool` via `requiresAuth` → return an MCP error result if `!user`.
- **Rate limiting.** Keep `ApiRateLimitGuard` on the route so MCP traffic counts against the same
  per-key limits as REST.
- **CORS.** Add CORS for `/mcp` allowing `Content-Type`, `Authorization`, `Mcp-Session-Id`,
  `Mcp-Protocol-Version` and exposing `Mcp-Session-Id`. Needed for browser-based MCP clients;
  Smithery's server-to-server scan doesn't need it but it's harmless.
- **Isolation.** The authenticated user comes **only** from `req.user`. Never fall back to an env
  key. Add a test asserting user A's key cannot read user B's inventory.

---

## 8. Smithery registration (after deploy)

1. Deploy so `https://iwantmymtg.net/mcp` is live.
2. On Smithery, add/convert the server to a **Remote (URL)** connection pointing at
   `https://iwantmymtg.net/mcp`, with a config schema field for the API key that Smithery injects as
   `Authorization: Bearer <key>`. (Smithery forwards user config to remote servers; map the key to
   that header.)
3. (Optional, belt-and-suspenders) Serve a static
   `https://iwantmymtg.net/.well-known/mcp/server-card.json` (`serverInfo` + `tools` per
   `@modelcontextprotocol/sdk/types.js`, `Access-Control-Allow-Origin: *`). This is the documented
   scan-bypass for URL listings.
4. Confirm the Releases → Quality Score panel now shows tools and a non-zero Capability Quality.

### Follow-up to reach ~100 (separate small PR, both repos)
Add to the tool **contract** (so stdio + in-app stay identical):
- `outputSchema` per tool (≈10.4 pts) — derive shapes from the existing API response DTOs
  (`*-response.dto.ts`).
- `annotations` per tool (≈5.9 pts): `readOnlyHint` (true for cards/sets/list/get), `destructiveHint`
  (true for `remove_inventory`, `delete_transaction`, `delete_alert`), `idempotentHint`,
  `openWorldHint: false`.

---

## 9. Verification

Local (`npm run start:dev`):
```bash
# initialize + tools/list — expect 33 tools
curl -s http://localhost:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}'
# then tools/list with id:2 …
```
Or point the MCP Inspector (`npx @modelcontextprotocol/inspector`) at `http://localhost:3000/mcp`.

Checks:
- `tools/list` → 33 tools, descriptions + parameter descriptions present, snake_case names.
- `search_cards` works with **no** Authorization header.
- `list_inventory` with no key → MCP error ("requires API key"); with a valid `iwm_live_...` key →
  that user's rows only.
- A premium portfolio tool with a free key → premium error matching REST behavior.
- REST regression: existing `/api/v1/*` endpoints and web pages unchanged (`npm test`,
  `npm run test:integ`).

---

## 10. Risks / watch-outs

- **Portfolio method names** unconfirmed during planning — verify against the service + REST
  controller (§6 note).
- **Premium gating** must be preserved; don't expose premium analytics to free keys via MCP.
- **Per-request server creation** cost is negligible (no DB on construct), but ensure the transport
  is closed on `res` finish to avoid leaks.
- **Global `express.json()`** interaction — covered in §7; pass `req.body`.
- **Don't touch** the stdio `iwantmymtg-mcp` repo in this work except the optional §8 follow-up.

---

## 11. Suggested commit breakdown

1. `chore(mcp): add @modelcontextprotocol/sdk + zod deps`
2. `feat(mcp): module, controller, stateless streamable-HTTP transport`
3. `feat(mcp): read-only card/set tools`
4. `feat(mcp): inventory + transaction tools`
5. `feat(mcp): portfolio (premium) + alert + notification tools`
6. `test(mcp): tools/list count, anon read-only, per-user isolation, premium gate`
7. `docs(mcp): wire-up + Smithery remote registration notes`

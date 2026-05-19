# MCP Rollout Handoff

Tracks the state of the §4.3 MCP Server initiative across both repos. Update
this doc whenever a task moves to done so future sessions can pick up without
re-deriving status.

## Repos

- **iwantmymtg** (this repo) - web app, OpenAPI spec, developer portal.
- **iwantmymtg-mcp** (`../iwantmymtg-mcp`) - MCP server, ships to npm.

## Done

### Web app prereqs - branch `mcp-web-prereqs`, commit `398e4a0`

- `/.well-known/openapi.json` and `/.well-known/openapi-public.json` 301 to
  `/api/openapi(-public).json` (`src/main.ts`).
- New guide page `/developer/guides/mcp-server`
  (`src/http/views/developerMcpServer.hbs` + handler in
  `src/http/hbs/api-tier/developer.controller.ts`).
- Card on `/developer` hub linking to the guide
  (`src/http/views/developer.hbs`).
- "Use with Claude (MCP)" section on `/user/api-keys`
  (`src/http/views/apiKeys.hbs`).
- Sitemap entry in `src/http/hbs/sitemap/sitemap.controller.ts`.
- ROADMAP §4.3 web prereqs marked complete.
- 1060 unit tests passing; type check clean.

Branch is pushed; PR not opened yet.

### MCP server itself (`../iwantmymtg-mcp`, commit `a4981e9`)

- Scaffold on `@modelcontextprotocol/sdk` (stdio, Node 20+).
- All read-only tools: search_cards, get_card, get_card_prices,
  get_card_price_history, search_sets, get_set, list_set_cards,
  get_sealed_products.
- All authenticated tools: inventory CRUD + quantities, transactions CRUD,
  full portfolio surface, price alerts CRUD, notifications.
- Rate-limit headers captured in `ApiError`.
- `IWMM_BASE_URL` override.
- README with Claude Desktop + Claude Code snippets.

### MCP server tests + CI - branch `mcp-tests-ci` in `iwantmymtg-mcp`, awaiting review

- 45 unit tests on `node:test` covering `apiFetch` (auth header, query
  serialization, 204/error handling, rate-limit header capture) and one
  happy-path test per registered tool (path/method/body/auth wiring).
- Lazy getters on `src/config.ts` so tests flip `IWMM_API_KEY` between cases
  without import-time snapshot gymnastics.
- `.github/workflows/ci.yml` - build + test on push to main and PRs.
- `.github/workflows/publish.yml` - on `v*` tag: build, test, verify
  package.json version matches tag, `npm publish --provenance`.
- Needs `NPM_TOKEN` secret on the repo before the publish workflow can run.

Branch pushed; PR not opened yet.

## Done (continued)

### npm publish - `iwantmymtg-mcp@0.1.0`

- Published via Trusted Publishing (OIDC) - no long-lived `NPM_TOKEN` secret;
  GitHub Actions identity is configured as a trusted publisher on the npm
  package.
- Workflow bumped to Node 24 (npm 11 ships natively, required by trusted
  publishing).
- Publish workflow gated to tags reachable from `main` - feature-branch
  tags fail fast with an actionable message instead of publishing.
- `dist-tags.latest = 0.1.0`; published by `npm-oidc-no-reply@github.com`.

### `0.2.0` UX pass - branch `mcp-examples-and-gating-ux` in `iwantmymtg-mcp`

- `src/error-formatter.ts` parses NestJS-style JSON error bodies and
  surfaces clean LLM-facing messages: API-key setup hint for 401, upgrade
  prompt with `/pricing` link for 402/403, reset-time note for 429.
- Cursor config snippet added to README.
- `examples/` dir scaffolded: README index plus per-flow walkthroughs
  (card lookup, inventory, transactions, portfolio, price alerts, sealed
  products). Screenshots/real transcripts still to be captured.
- 13 new tests for the error formatter; 58 tests total, all passing.
- Bumped to `0.2.0` (User-Agent + package + MCP server version).

PR not opened yet; merge -> tag `v0.2.0` -> publish workflow handles npm.

## Next up (in order)

1. **Capture real screenshots/transcripts** in `examples/` once you've
   exercised the flows in Claude Desktop / Cursor / Claude Code.
2. **Typed API client from OpenAPI** - currently hand-rolled zod schemas;
   will drift. Generate at build time with `openapi-typescript` +
   `openapi-fetch`.
3. **Discovery** - PR to `modelcontextprotocol/servers`, list on Smithery
   and Glama, post on r/ClaudeAI + r/mtgfinance.
4. **Content** - tutorial blog post, demo GIF.

## Deferred

- Remote MCP transport (Streamable HTTP) at `mcp.iwantmymtg.net` - needs
  OAuth design; revisit once stdio version has traction.
- MCP resources (vs tools) for URI-style browsing.
- MCP prompts for common workflows.

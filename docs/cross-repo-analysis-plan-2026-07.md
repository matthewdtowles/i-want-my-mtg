# Cross-Repo Analysis Plan - July 2026

One plan covering the findings from the four codebase analyses run on 2026-07-07. Each repo has its own detailed analysis doc; this file ties them together, resolves the cross-repo dependencies, and defines the work packages that become GitHub issues (all tracked in the "I Want My MTG" GitHub project).

## Source documents

The full per-repo analyses (every finding with file/line references and recommendations) live in this repo, next to this plan:

| Repo | Analysis doc |
|---|---|
| [i-want-my-mtg](https://github.com/matthewdtowles/i-want-my-mtg) (web) | [codebase-analyses-2026-07/web.md](codebase-analyses-2026-07/web.md) |
| [scry](https://github.com/matthewdtowles/scry) (ETL) | [codebase-analyses-2026-07/scry.md](codebase-analyses-2026-07/scry.md) |
| [iwantmymtg-mcp](https://github.com/matthewdtowles/iwantmymtg-mcp) (MCP server) | [codebase-analyses-2026-07/mcp.md](codebase-analyses-2026-07/mcp.md) |
| [i-want-my-mtg-mobile](https://github.com/matthewdtowles/i-want-my-mtg-mobile) (mobile) | [codebase-analyses-2026-07/mobile.md](codebase-analyses-2026-07/mobile.md) |

Finding IDs below (B1, §1.2, I11, 1.6, ...) refer to those docs.

## How the four repos relate

```
            scry (Rust ETL)                    i-want-my-mtg (NestJS web)
        writes card/set/price data  ------>    owns schema (migrations), serves site + API
                                                    |
                                            OpenAPI spec (/api/openapi.json)
                                               /                \
                              iwantmymtg-mcp                i-want-my-mtg-mobile
                              (generated api-types,         (generated schema.ts,
                               weekly sync workflow)          CI drift check vs live spec)
```

- The **web repo owns the database schema**. Scry writes into it; a schema change lands via web migrations, and the deploy order rule (publish scry first, deploy web second) already exists in web's CLAUDE.md.
- The **web repo's OpenAPI spec is the contract** both clients generate from. Spec defects propagate as client workarounds; spec fixes propagate as client regeneration.
- Mobile's CI regenerates its schema from the **live production** spec on every PR, so web API deploys can break mobile CI immediately.

## Cross-repo work items (the part that must be sequenced)

### X1. Delete integrity: ON DELETE CASCADE migration (web) then scry delete cleanup

Scry §1.2-1.3: the `DELETE FROM ... CASCADE` statements do nothing (`CASCADE` parses as a table alias), and the batch-delete paths miss FK dependents (`price_history`, `granular_price_history`, `inventory`), so pruning a card that has history rows fails.

- **Web**: add a migration putting `ON DELETE CASCADE` on the FKs from `price_history`, `granular_price_history`, and (decide deliberately) `inventory` to `card(id)`. Decide the `inventory` question explicitly: cascading user inventory on card deletion is a product decision, not just hygiene. Also update `docker/postgres/init/001_complete_schema.sql`.
- **Scry**: after the migration is deployed, simplify the delete paths to delete only from `card` / `set` and remove the fake `CASCADE` tokens; replace `reset_data` with a single `TRUNCATE ... CASCADE`; add an integration test deleting a card that has `price_history` rows.
- **Order**: web deploys the migration first (migrations run before the scry binary refresh in the same deploy, so a single web deploy after the scry release is also safe per the existing rule). Scry's simplification merges only after the migration is live.

### X2. `granular_price_history` retention is unowned

Scry §8: CLAUDE.md claims the `retention` command covers `granular_price_history`; no code touches it. CK-direct writes grow it daily without bound.

- **Decision**: retention lives in scry (same tiered policy as the other history tables, or a simpler age cutoff if granular data does not need tiering).
- **Scry**: implement it inside `retention` (reusing the shared retention helper from scry §4.2) and fix the docs.
- **Web**: no code change; verify table size on prod after the first run.

### X3. OpenAPI spec quality fixes (web) unblock both clients

Mobile 3.6 and MCP I8 independently flag the same upstream defects in web's spec:

- `page`/`limit` on `/notifications` and `days` on price-history endpoints are typed `string` (should be `number`, like `/sets` and `/cards`).
- `DeckImportApiResultDto.errors` is specced as `Record<string, never>[]` but actually carries `{ row, name?, error }` - clients can only count errors, not show them.
- Several query params are typed `unknown`, forcing MCP's `as never` casts.

- **Web**: fix the `@ApiQuery`/DTO annotations; regenerate and publish the spec.
- **MCP**: weekly sync picks it up (or trigger manually); then sweep the now-unnecessary `as never` casts (I8).
- **Mobile**: regenerate `lib/api/schema.ts`, drop the `String(page)` casts, and render deck-import row errors.
- **Order constraint**: mobile must first decouple its CI spec-drift check from PR gating (mobile 1.7), otherwise the web deploy breaks every open mobile PR the moment it ships.

### X4. Delta-quantity endpoint (web) then mobile stepper fix

Mobile 1.6: inventory/buy-list writes are absolute-quantity only, so rapid stepper taps race, and `bulkAddToInventory` needs read-modify-write.

- **Web**: add an increment/delta variant to the inventory and buy-list write APIs (and expose it in the spec).
- **Mobile**: short-term debounce + settle-time invalidation ships independently (no dependency); the delta endpoint adoption is a follow-up.
- **MCP**: optional follow-up to expose the delta operation as a tool refinement.

### X5. Scry's integration-test schema must track web migrations

Scry §2.5: `tests/fixtures/schema.sql` has drifted (wrong `portfolio_value_history` columns, five tables missing entirely). Since web owns the schema, the fixture should be generated or synced from web's `docker/postgres/init` + `migrations/`, not hand-maintained. One-time sync now, plus a documented refresh step (or script) for future migrations.

### X6. Error-body consistency (web) helps both clients

Web B1/A1 (the domain-error overhaul) changes API error responses: correct statuses (401 vs 404, 400 vs 500) and predictable bodies. MCP's `extractApiMessage` and mobile's `errMessage` both parse `error`/`message` fields; after the web overhaul, verify both clients' error formatting against the new bodies (no code change expected, just verification).

## Global sequencing

Independent tracks can proceed in parallel; the arrows are the only hard orderings.

1. **Mobile 1.7 first** (decouple CI drift check) - tiny, unblocks all web spec work (X3, X4).
2. **Web migration for X1** -> scry delete cleanup.
3. **Web spec fixes (X3) + delta endpoint (X4)** -> MCP/mobile regeneration follow-ups.
4. Everything else is repo-local and unordered; each repo's analysis doc has its own priority table, preserved in the work packages below.

## Work packages (one GitHub issue each)

### i-want-my-mtg (web)

| # | Title | Findings | Priority |
|---|---|---|---|
| [W1](https://github.com/matthewdtowles/i-want-my-mtg/issues/569) | Error handling overhaul: domain errors end to end | B1, A1, A2, A9, part of B9 | 1 |
| [W2](https://github.com/matthewdtowles/i-want-my-mtg/issues/570) | Inventory/ledger integrity: transactional writes, fix silent failures | B2, B3, B4, P2 | 1 |
| [W3](https://github.com/matthewdtowles/i-want-my-mtg/issues/571) | Query/input hardening: filter charset, limit caps, pool config | B7, B8, B5, B14 (days clamp) | 2 |
| [W4](https://github.com/matthewdtowles/i-want-my-mtg/issues/572) | Security hardening: error leaks, enumeration, token hashing, Stripe sync | B9, B10, C5, B13 | 2 |
| [W5](https://github.com/matthewdtowles/i-want-my-mtg/issues/573) | Performance: set page, batched imports, Promise.all | B12, P1, P3, A6 | 2 |
| [W6](https://github.com/matthewdtowles/i-want-my-mtg/issues/574) | TypeScript strictness + type-aware lint | C1, C2, C7 | 3 |
| [W7](https://github.com/matthewdtowles/i-want-my-mtg/issues/575) | Architecture cleanup: dead code, read models, presenters, logging | A3-A8, A10, B6, B11, B14 rest, C3, C4, C8 | 3 |
| [W8](https://github.com/matthewdtowles/i-want-my-mtg/issues/576) | OpenAPI spec fixes + delta-quantity endpoint (cross-repo X3, X4) | mobile 3.6, MCP I8, mobile 1.6 | 2 |
| [W9](https://github.com/matthewdtowles/i-want-my-mtg/issues/577) | Migration: ON DELETE CASCADE for card/set dependents (cross-repo X1) | scry §1.2-1.3 | 1 |

### scry

| # | Title | Findings | Priority |
|---|---|---|---|
| [S1](https://github.com/matthewdtowles/scry/issues/35) | Fix post-ingest-prune: persist card foreignness | §1.1 | 1 |
| [S2](https://github.com/matthewdtowles/scry/issues/36) | Delete/reset FK coverage; remove fake CASCADE (cross-repo X1, after W9) | §1.2-1.3 | 1 |
| [S3](https://github.com/matthewdtowles/scry/issues/37) | Ingest robustness: stream failures, non-TTY prompts, batch-boundary and mapping bugs | §1.4-1.10 | 1 |
| [S4](https://github.com/matthewdtowles/scry/issues/38) | Implement granular_price_history retention (cross-repo X2) | §8 | 1 |
| [S5](https://github.com/matthewdtowles/scry/issues/39) | Remove no-op concurrency and dead granular parsing; fix misleading counts | §2.1-2.4, 2.6 | 2 |
| [S6](https://github.com/matthewdtowles/scry/issues/40) | Structure: thin main.rs, extract IngestPipeline, add ports for testability | §3.1-3.5 | 2 |
| [S7](https://github.com/matthewdtowles/scry/issues/41) | DRY, perf, and transactionality cleanup | §4, §5, §6, §7, §10 | 3 |
| [S8](https://github.com/matthewdtowles/scry/issues/42) | Tooling: clippy/fmt CI gates, Docker hardening, schema fixture sync (X5), docs refresh | §2.5, §8 (docs), §9 | 2 |

### iwantmymtg-mcp

| # | Title | Findings | Priority |
|---|---|---|---|
| [M1](https://github.com/matthewdtowles/iwantmymtg-mcp/issues/19) | Correctness bundle: undefined results, CSV passthrough, JSON Schema target, empty patch, parse-in-tests | B1, B2, B3, B4, T1 | 1 |
| [M2](https://github.com/matthewdtowles/iwantmymtg-mcp/issues/20) | ToolDefinition refactor: generics, requiresAuth, annotations, auth invariant test | A1, A2, I11, A4, T2 | 2 |
| [M3](https://github.com/matthewdtowles/iwantmymtg-mcp/issues/21) | Consistency sweep: shared schemas/enums, client memoization, error polish, as-never sweep (part of X3) | I1-I10, A3, A5, A6, I8 | 3 |
| [M4](https://github.com/matthewdtowles/iwantmymtg-mcp/issues/22) | Tooling: linter in CI, NodeNext, Node 20 matrix, force-with-lease, server handler tests | C1-C4, T3 | 2 |

### i-want-my-mtg-mobile

| # | Title | Findings | Priority |
|---|---|---|---|
| [MB1](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/63) | Clear query cache on sign-out (cross-account data leak) | 1.1 | 1 |
| [MB2](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/64) | Decouple CI spec-drift check from PR gating (unblocks web X3/X4) | 1.7 | 1 |
| [MB3](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/65) | Behavior fixes: double inset, silent rollbacks, stepper debounce + settle invalidation, small nits | 1.2, 1.3, 1.6, 1.8 | 2 |
| [MB4](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/66) | Notification badge via unread-count; inbox paginates on scroll | 1.4 | 2 |
| [MB5](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/67) | Centralize query keys; re-key deck-owned under inventory | 1.5, 3.1 | 2 |
| [MB6](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/68) | Test + lint infrastructure (jest-expo, ESLint), cover pure modules | 4.1, 4.2 | 2 |
| [MB7](https://github.com/matthewdtowles/i-want-my-mtg-mobile/issues/69) | Shared UI + hooks layer: steppers, rows, chips, useOptimisticMutation, edit-by-id screens | 2.1-2.8, 3.2-3.5 | 3 |

## Shared themes (context, not separate issues)

- **Lint/CI gates are missing or weak in all four repos** (web C2, scry §9, MCP C1, mobile 4.2). Each repo's tooling issue covers its own.
- **All four analyses praise the same discipline**: generated types with drift checks (MCP, mobile), port-adapter boundaries (web), allowlist-driven SQL safety (web), hashed refresh tokens (web), single-flight auth refresh (mobile). The work above extends those patterns rather than replacing them.
- **Nothing in the four docs conflicts.** The only orderings that matter are X1 (web migration before scry cleanup) and X3/X4 (mobile CI decoupling before web spec changes); everything else is repo-local.

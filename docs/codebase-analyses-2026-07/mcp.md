# Codebase Analysis — Findings & Recommendations

Full review of `iwantmymtg-mcp` at `a152ba6` covering bugs, inconsistencies, and
deviations from best practices (clean code, DRY, testability, hexagonal
layering). Build and tests pass (91/91) — everything below is about latent
defects and maintainability, not currently failing behavior.

**Overall assessment:** this is a well-built, unusually disciplined small
codebase. Lazy config, the auth-sentinel middleware, generated OpenAPI types,
the generated tool catalog with CI drift checks, and the release pipeline are
all above-average patterns. The findings below are mostly consistency and
hardening issues, with two genuine runtime bugs at the top.

---

## 1. Bugs

### B1 (High) — Empty API responses produce invalid MCP tool results

`src/server.ts:58` serializes every successful handler result with
`JSON.stringify(result, null, 2)`. When a handler resolves `undefined`,
`JSON.stringify(undefined)` returns `undefined` (not a string), so the server
emits:

```json
{ "content": [{ "type": "text" }] }
```

`text` is a **required** field on MCP text content; strict clients will reject
the response, and the user sees a protocol error instead of a success.

This is reachable today: openapi-fetch returns `data: undefined` for any 204
or empty-body response (the project's own test asserts exactly this —
`test/api-client.test.ts:73-82`, "returns undefined data for 204 responses").
Several endpoints are declared with empty success bodies in the generated spec
(e.g. `TransactionApiController_delete` → `200, content?: never`), so any
delete/refresh endpoint that returns no body silently corrupts the tool result.

**Fix** in `src/server.ts`:

```ts
const result = await tool.handler(args.data);
const text =
  result === undefined
    ? "OK"
    : typeof result === "string"
      ? result
      : JSON.stringify(result, null, 2);
return { content: [{ type: "text", text }] };
```

(The `typeof result === "string"` branch also fixes B2.)

### B2 (Medium) — `export_inventory` CSV is double-encoded

`export_inventory` (`src/tools/inventory.ts:106-118`) fetches with
`parseAs: "text"` and returns a raw CSV string. `server.ts` then
`JSON.stringify`s it, so the model receives:

```
"id,name\n1,Bolt"
```

— one giant quoted string with escaped newlines instead of readable CSV. It
works, but it wastes tokens and makes the output hard for both the model and
the user to read. The B1 fix (pass strings through unchanged) resolves this.

### B3 (Medium) — `zodToJsonSchema` target `"openApi3"` emits non-JSON-Schema output

`src/server.ts:29` converts input schemas with `{ target: "openApi3" }`.
OpenAPI 3.0 represents nullability as `nullable: true`, which is **not** JSON
Schema. Verified output for `update_price_alert`:

```json
"increasePct": { "type": "number", "minimum": 0.01, "nullable": true }
```

MCP `inputSchema` is defined as JSON Schema. A client that validates arguments
strictly will see `"type": "number"`, ignore the unknown `nullable` keyword,
and reject `null` — which breaks the *documented* "pass null for a threshold
to clear it" feature of `update_price_alert` (`src/tools/alerts.ts:43`).

**Fix:** drop the target option (the default `jsonSchema7` emits
`"type": ["number", "null"]`):

```ts
inputSchema: zodToJsonSchema(t.inputSchema) as Record<string, unknown>,
```

Verify with an MCP client that consumed the openApi3 shape before shipping.

### B4 (Low) — `update_price_alert` accepts an empty patch

`create_price_alert` refines "at least one threshold required"
(`src/tools/alerts.ts:24-30`), but `update_price_alert` has no equivalent: a
call with only `id` passes validation and PATCHes an empty body `{}` — a
guaranteed server-side rejection (or worse, a silent no-op) that zod could
catch locally with a clearer message:

```ts
.refine((v) => v.increasePct !== undefined || v.decreasePct !== undefined || v.isActive !== undefined,
  { message: "Provide at least one field to update." })
```

---

## 2. Inconsistencies

### I1 — The format enum is duplicated and diverges between tools

The generated spec defines the format enum
(`"standard" | "commander" | ... | "pioneer"`) for both card search and decks.
The codebase handles it three different ways:

- `src/tools/decks.ts:11-23` hand-copies it as `FORMATS` (will silently drift
  when the API adds a format — the weekly sync updates the spec types, not
  this list).
- `src/tools/search-cards.ts:19-21` accepts free-form `z.string()`, so a typo
  (`"cmmander"`) becomes an API 400 instead of a local validation error.
- `src/tools/sets.ts:40` (`list_set_cards`) — same free string.

**Fix:** declare the enum once (e.g. `src/tools/shared.ts`), derive its type
from the generated spec so drift becomes a compile error, and reuse the same
`z.enum` in all three places:

```ts
import type { operations } from "../generated/api-types.js";
type ApiFormat = NonNullable<operations["searchCards"]["parameters"]["query"]>["format"];
export const FORMATS = ["standard", "commander", /* ... */] as const satisfies readonly ApiFormat[];
```

### I2 — Card-key schema duplicated

`{ setCode, setNumber }` with identical descriptions is defined in
`src/tools/get-card.ts:4-7` and re-written inline in
`src/tools/sell-tools.ts:14-19`. Export the one schema (and the `CardKey`
type) and reuse it.

### I3 — Three different conventions for numeric ID inputs

- `z.coerce.number().int()` — alerts (`alerts.ts:45,63`), notifications
  (`notifications.ts:32`)
- `z.number().int().min(1)` — transactions (`transactions.ts:68,84`), decks
  (`decks.ts:30-34`)

Coercing IDs accepts `"42"` from imprecise models (a nice affordance);
non-coercing ones reject it. Pick one shared helper —
`const id = z.coerce.number().int().min(1)` — and use it everywhere.

### I4 — `cardId` validation differs across tools

Inventory, decks, buy-list, and alerts validate `cardId` as
`z.string().uuid()`; transactions (`src/tools/transactions.ts:5`) accept any
string. Same underlying identifier, different strictness. Share a single
`cardId` schema (buy-list.ts:10-13 already has the right one, description
included).

### I5 — Update-tool input shapes differ

`update_transaction` nests changes under a `patch` object
(`transactions.ts:67-70`); `update_price_alert` and `update_deck` flatten
fields alongside `id`. Flat inputs are easier for models to produce and match
the rest of the registry — flatten `update_transaction` (`{ id, quantity?,
pricePerUnit?, ... }`) and spread into the body.

### I6 — Query-param serialization handled three ways

- `get_set_price_history` converts: `{ days: String(days) }` (`sets.ts:75`)
- `get_cash_vs_credit` converts: `{ bonus: String(input.bonus) }` (`sell-tools.ts:57`)
- `get_portfolio_history` passes the raw number: `{ days } as never` (`portfolio.ts:26`)
- `get_cost_basis` passes a raw boolean where the spec says `isFoil?: string` (`transactions.ts:109`)

All serialize to the same URL string, so the `String()` calls are noise —
but the inconsistency makes readers wonder which one is load-bearing. Pick
one style (raw values; the URL serializer stringifies) and note why once.

### I7 — `search_cards` lags the API spec

The generated spec exposes `groupBy: "name"` ("one representative printing per
distinct card name") on `searchCards` — arguably the most LLM-friendly search
mode — but the tool doesn't surface it (`search-cards.ts:4-28`). The spec also
documents that `legality` without `format` is a 400; a
`.refine((v) => !v.legality || !!v.format)` would catch that locally.

### I8 — `as never` casts are broader than necessary

The casts exist because the spec types many query params as `unknown` — fair.
But some casts fight *typed* spec entries: `transactions.ts:73,87` cast
`{ path: { id } as never }` even though the spec declares `id: number`, and
`portfolio.ts` casts fully-typed query objects. Each unnecessary `as never`
silently disables the type-checking the generated spec exists to provide.
Sweep them; keep casts only where the spec is genuinely `unknown`, and
consider fixing the upstream OpenAPI annotations (the source API's
`@ApiQuery` types) so even those disappear.

### I9 — `colors` drop-logic duplicated

`getPortfolioBreakdownTool` and `getPortfolioBreakdownCardsTool` both repeat
`input.by === "color" ? input.colors : undefined` (`portfolio.ts:92,120`).
Trivial, but a shared helper (or a `.transform` on a shared schema fragment)
keeps the rule in one place.

### I10 — `inventoryItem.quantity` semantics differ between add and update

One schema serves both `add_inventory` and `update_inventory`
(`inventory.ts:4-8`) with `min(0)` and the description "0 removes the row."
For **add**, quantity 0 is nonsensical; the description is only true for
update. Split into `min(1)` for add and keep `min(0)` + the removal note for
update.

### I11 — Auth-ness is convention-by-description-suffix

Whether a tool needs auth is encoded three separate ways:

1. The literal string "Requires IWMM_API_KEY." at the end of each description.
2. A regex over that string in `scripts/gen-tools-doc.ts:20`.
3. A hardcoded `readOnly` allow-list in `test/tools.test.ts:78-90`.

The test admirably keeps the convention honest, but this is stringly-typed
metadata maintained in triplicate. **Fix:** add `requiresAuth: boolean` to
`ToolDefinition`, derive the description suffix, the doc bucketing, and the
test assertion from it — and it can then also drive `AUTH_HEADERS`
automatically instead of every authenticated handler remembering to pass
`headers: AUTH_HEADERS` (a forgotten header today = confusing 401 at runtime,
uncaught by any test or type).

---

## 3. Architecture & clean code

### A1 — `ToolDefinition` erases the schema↔handler type link

`src/tools/index.ts:80-85`:

```ts
handler: (input: any) => Promise<unknown>;
```

Every tool hand-writes its handler's input type (`decks.ts:164-169` etc.) and
nothing checks it matches the zod schema — the two can drift silently (e.g. a
schema gains `.default(false)` but the handler type still says the field is
optional, or vice versa). Tools also aren't declared against the interface at
their definition site, so a malformed tool object only fails at the registry
test, not at compile time.

**Fix:** make the definition generic and add a tiny factory so types are
inferred, never hand-written:

```ts
// src/tools/types.ts
export interface ToolDefinition<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  requiresAuth: boolean;          // see I11
  inputSchema: S;
  handler: (input: z.output<S>) => Promise<unknown>;
}

export function defineTool<S extends z.ZodTypeAny>(t: ToolDefinition<S>) {
  return t;
}
```

This deletes ~40 hand-maintained input type annotations, catches
schema/handler drift at compile time, and gives `z.output` semantics (defaults
applied) for free.

### A2 — `ToolDefinition` lives in the registry module

The shared contract is declared in `src/tools/index.ts`, the same file that
imports every tool module. Tool modules can't reference their own contract
without creating an import cycle. Move it to `src/tools/types.ts` (as above).
In hexagonal terms: `ToolDefinition` is the port; `server.ts` is the driving
adapter; `api-client.ts` is the driven adapter — the port shouldn't live
inside the composition root.

### A3 — Proxy-based `apiClient` rebuilds the client on every property access

`src/api-client.ts:60-65` constructs a fresh `createClient` + re-registers the
middleware on **every** `apiClient.GET/POST/...` access. The laziness goal
(tests stubbing `globalThis.fetch` late, live `baseUrl`) is already satisfied
by the existing `fetch: (...args) => globalThis.fetch(...args)` indirection
and by memoizing per base URL:

```ts
let cached: { baseUrl: string; client: ApiClient } | undefined;
function buildClient(): ApiClient {
  if (cached?.baseUrl !== config.baseUrl) {
    const client = createClient<paths>({ baseUrl: config.baseUrl, fetch: (...a) => globalThis.fetch(...a) });
    client.use(authMiddleware);
    cached = { baseUrl: config.baseUrl, client };
  }
  return cached.client;
}
```

Cheap, removes per-call allocation, and is far less surprising than a Proxy.

### A4 — Missing MCP tool annotations

Many tools are real writes — `delete_deck` is documented as *permanent* —
but no tool declares MCP annotations (`readOnlyHint`, `destructiveHint`,
`idempotentHint`). Descriptions saying "This is a real write" help the model;
annotations are the structured contract that lets **clients** gate/confirm
destructive calls. With `requiresAuth` (I11) and a `readOnly`/`destructive`
flag on `ToolDefinition`, `server.ts` can emit them in `ListTools` and the
existing description conventions can be generated instead of hand-typed.

### A5 — Raw zod error dump in argument failures

`src/server.ts:49` returns `args.error.message`, which is the JSON-stringified
issue array — verbose and noisy for a model to parse. Prefer a flattened,
per-field summary:

```ts
const issues = args.error.issues
  .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
  .join("; ");
```

### A6 — Minor error-formatter polish

- `formatApiError` 429 branch echoes `X-RateLimit-Reset` raw
  (`error-formatter.ts:24`); when it's epoch seconds the model sees
  "Resets at 1700000000." Convert numeric values with
  `new Date(reset * 1000).toISOString()`.
- `extractApiMessage` joins `message` arrays without checking element types
  (`error-formatter.ts:41`); a non-string entry renders "[object Object]".
  Filter with `.filter((m) => typeof m === "string")`.

---

## 4. Testing gaps

### T1 — Tool tests bypass the schema, so the production input path is untested

`test/tools.test.ts:42-47` deliberately skips `inputSchema` parsing ("we trust
zod"). But parsing is not just validation — it *transforms*: defaults
(`get_cost_basis` `isFoil.default(false)`), coercions
(`update_price_alert` `z.coerce.number()`), and refinements all run only
through parse. The handlers are therefore tested with inputs they never
receive in production, and a schema/handler mismatch (see A1) passes tests.
One-line fix in the helper:

```ts
await tool.handler(tool.inputSchema.parse(input));
```

(Then tests like `get_cost_basis` can drop their manually supplied defaults —
asserting the default itself.)

### T2 — No test that every authenticated tool actually sends auth

The `readOnly` set test (tools.test.ts:77) checks *descriptions*, and
individual endpoint tests spot-check `Authorization`. But nothing asserts the
general invariant "every non-read-only tool sends `Bearer ...`" — the exact
failure mode of forgetting `headers: AUTH_HEADERS` in a new tool. With
`requiresAuth` on the definition (I11) this becomes a loop:
call each tool with minimal valid input, assert the Authorization header
matches `requiresAuth`.

### T3 — No test for the server request handlers

`src/server.ts`'s CallTool handler (unknown tool, invalid args, thrown
`ApiError` → `formatError`, undefined result → B1) has no coverage; it's the
one file gluing everything together. Extract the handler bodies into exported
functions (or test via an in-memory transport) and cover those four branches —
B1 would have been caught.

---

## 5. Tooling / CI / config

### C1 — No linter or formatter

There is no ESLint/Biome/Prettier config and no CI lint step. For a
public, published package with outside contributors (CONTRIBUTING.md exists),
add one — Biome is a good single-tool fit for a codebase this size — and wire
it into `ci.yml` next to `check:tools-doc`.

### C2 — `moduleResolution: "Bundler"` for a tsc-compiled Node app

`tsconfig.json` uses `module: ES2022` + `moduleResolution: Bundler`, but the
output runs directly on Node (no bundler). "Bundler" does not verify that
import specifiers are runtime-resolvable — it would happily accept
extension-less relative imports that then crash at `node dist/index.js`. The
code currently survives because every import hand-writes `.js`, but nothing
enforces it. Switch to `module`/`moduleResolution: "NodeNext"`, which
enforces the exact semantics the runtime uses. Also `resolveJsonModule` is
enabled but unused (`version.ts` uses `createRequire` instead — which is the
right call, since importing package.json would change the dist layout; just
drop the unused flag).

### C3 — CI tests only Node 24; engines say `>=20`

`package.json` declares `engines: { node: ">=20" }` but `ci.yml` builds and
tests only on Node 24. Test the floor you promise — a small matrix
(`[20, 24]`) or at least Node 20.

### C4 — `sync.yml` force-pushes a shared branch pattern

`git push -u origin "$BRANCH" --force` (sync.yml:55) with a date-stamped
branch name is fine in practice, but if the job runs twice the same day with a
human commit added to the PR meanwhile, that commit is destroyed. Prefer
`--force-with-lease`.

---

## 6. Prioritized action list

| # | Finding | Severity | Effort |
|---|---------|----------|--------|
| B1 | `undefined` results emit invalid MCP content | High | XS |
| B3 | `openApi3` schema target breaks `null` inputs | Medium | XS |
| B2 | CSV export double-encoded | Medium | XS (folded into B1) |
| A1/A2 | Generic `ToolDefinition` + `defineTool`, move to own module | Medium | M |
| I11/A4/T2 | `requiresAuth` flag → auto headers, annotations, doc, test | Medium | M |
| T1 | Parse inputs in the tool-test helper | Medium | XS |
| B4 | Empty-patch refinement on `update_price_alert` | Low | XS |
| I1 | Single spec-derived format enum | Low | S |
| I2–I6, I9, I10 | Schema/style consolidation | Low | S |
| A3 | Memoize the API client | Low | XS |
| A5, A6 | Error-message polish | Low | XS |
| T3 | Server handler tests | Medium | S |
| C1 | Add linter to CI | Medium | S |
| C2 | `NodeNext` module resolution | Low | XS |
| C3 | Test Node 20 in CI | Low | XS |
| C4 | `--force-with-lease` in sync workflow | Low | XS |

A sensible first PR: B1 + B2 + B3 + T1 + B4 (all extra-small, all
correctness). A second PR: the `ToolDefinition`/`requiresAuth` refactor
(A1/A2/I11/A4/T2), which mechanically absorbs most of the consistency items.

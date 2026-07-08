# Codebase Analysis: Bugs, Inconsistencies, and Recommendations

**Scope:** full read of the hand-written source (`app/`, `components/`, `lib/`, `scripts/`, `.github/`) — roughly 7,200 lines excluding the generated `lib/api/schema.ts`.
**Date:** 2026-07-07

## Overall assessment

The codebase is in good shape for its size: strict TypeScript, a typed API client generated from the backend OpenAPI spec with CI drift-checking, a well-designed auth layer (single-flight proactive token refresh with a 401 backstop and careful race guards), consistent theming through tokens, accessibility labels nearly everywhere, and unusually good explanatory comments. The findings below are mostly about (1) a handful of real bugs, (2) heavy copy-paste duplication that has accumulated across screens/components, and (3) missing test/lint infrastructure — not about structural rot.

Severity legend: 🔴 fix soon · 🟡 should fix · 🔵 improvement / polish

---

## 1. Bugs

### 1.1 🔴 Query cache is not cleared on sign-out (cross-account data leak)

`AuthContext.handleSignedOut` (`lib/auth/AuthContext.tsx:66`) clears tokens and push registration but never touches the TanStack Query cache. Only the delete-account flow clears it (`app/account.tsx:42`). All user-scoped queries use user-independent keys (`["inventory"]`, `["decks"]`, `["notifications"]`, `["buy-list"]`, `["transactions"]`, `["user","profile"]`, …), so if User A signs out and User B signs in on the same device within the cache `gcTime` (default 5 min), B is shown A's inventory, decks, profile, and notifications immediately while background refetches run. Even for the same user, stale caches survive an "expired session" sign-out.

**Recommendation:** clear the cache whenever authentication ends. `AuthProvider` renders inside `QueryClientProvider` (`app/_layout.tsx`), so the simplest correct fix is `queryClient.clear()` inside `handleSignedOut` (import the singleton from `lib/queryClient.ts`), or an `isAuthenticated` watcher in `RootNavigator` that clears on the `true → false` transition. `app/account.tsx` can then drop its own `clear()`.

### 1.2 🟡 Browse screen double-pads the top safe area

`app/(tabs)/index.tsx:56` renders the screen with `paddingTop: insets.top + 8`, but the tab navigator does **not** hide headers (`app/(tabs)/_layout.tsx` sets header styles and `headerRight`, so a header is shown). The header already consumes the status-bar inset; adding `insets.top` again leaves a ~50 px dead gap between the header and the search field. No other tab screen does this — it looks like a leftover from a header-less iteration. Compare `app/sign-in.tsx`, which correctly uses insets *because* it sets `headerShown: false`.

**Recommendation:** change to `paddingTop: 8` (and drop the now-unused `useSafeAreaInsets` import).

### 1.3 🟡 Optimistic quantity mutations fail silently

Several optimistic mutations roll back on error without telling the user, so a tapped **+1** quietly reverts a moment later and looks like a glitch:

- `app/(tabs)/inventory.tsx` — `setQuantity.onError` and `remove.onError` (rollback only)
- `components/BuyListView.tsx` — `setQuantity.onError`, `remove.onError`
- `components/AddToInventory.tsx`, `components/AddToBuyList.tsx` — `setQty.onError`
- `app/notifications.tsx` — `markRead.onError`, `markAll.onError`

Meanwhile `app/transactions.tsx` (`remove.onError`) and every deck mutation *do* show an `Alert`. This is both a UX bug and an internal inconsistency.

**Recommendation:** standardize error surfacing (an `Alert` or a small toast helper) in every `onError` alongside the rollback. This falls out naturally from the shared optimistic-mutation helper proposed in §2.5.

### 1.4 🟡 Notification badge fetches the user's entire notification history

`lib/useNotifications.ts` auto-pages the full notifications list (a `useEffect` that keeps calling `fetchNextPage`) so the unread count is exact, and `NotificationBell` — mounted in **every tab header** via `HeaderActions` — uses that hook. For a user with a long history this is a chain of sequential 50-row requests on app start, purely to render a badge, repeated whenever the query refetches (pushes invalidate it too). The backend already exposes `GET /api/v1/notifications/unread-count` (present in `lib/api/schema.ts`, unused by the app).

**Recommendation:** drive the bell badge from the `unread-count` endpoint (tiny payload, one request) and let the inbox screen paginate on scroll (`onEndReached`, as every other list already does) instead of eagerly draining all pages. Keep both under the `NOTIFICATIONS_KEY` family so push-arrival invalidation still refreshes the badge.

### 1.5 🟡 Deck "missing cards" counts go stale after inventory changes

`app/deck/[id].tsx` caches owned quantities under the ad-hoc key `["deck-owned", id, cardIds]`. Inventory mutations elsewhere invalidate the `["inventory"]` prefix only, so this query is never invalidated: add cards to inventory from a card page, navigate back to the deck, and the "need N" / missing-only view shows the old counts until `staleTime` lapses or the screen remounts.

**Recommendation:** put the key under the inventory family — e.g. `["inventory", "quantities", "deck", id]` — so the existing `invalidateQueries({ queryKey: ["inventory"] })` calls cover it. (This is exactly why `AddToInventory` uses `["inventory", "quantities", cardId]`.)

### 1.6 🟡 Unserialized absolute-quantity writes can lose rapid taps

The write APIs set an **absolute** quantity, and stepper taps fire one mutation per tap with no queueing: tapping **+ +** quickly sends `quantity: 2` then `quantity: 3` as independent requests. If the network delivers/handles them out of order, the server ends at 2 while the UI shows 3 — and `setQuantity` in `app/(tabs)/inventory.tsx` (unlike its sibling `remove`) has no `onSettled` invalidation to self-heal, so the drift persists until the next refetch. The same pattern exists in `BuyListView`, `AddToInventory`, `AddToBuyList`, and the deck stepper (the deck one does invalidate on settle).

The related read-modify-write race in `bulkAddToInventory` (`lib/api/inventory.ts`) is already documented in a comment; it has the same root cause.

**Recommendation:** short-term, debounce the write (send the final absolute value ~300 ms after the last tap — one request instead of N, ordering problem gone) and invalidate on settle everywhere. Longer-term, ask the backend for an increment/delta endpoint so bulk-add and steppers stop needing read-then-write.

### 1.7 🔵 CI depends on the live production API

`.github/workflows/ci.yml` regenerates `lib/api/schema.ts` from `https://iwantmymtg.net/api/openapi.json` on every PR and fails on drift. This is a deliberate, documented tradeoff, but it makes CI non-hermetic: a backend deploy (or backend downtime) breaks every open PR regardless of its content, and the failure lands on whoever pushes next.

**Recommendation:** keep the drift check but move it to a separate, non-required job (or a scheduled workflow that opens an issue/PR when the spec drifts), so `typecheck` remains the gate for merging app changes.

### 1.8 🔵 Small correctness/UX nits

- **`lib/format.ts` `formatPrice`** renders negatives as `$-3.00`; `app/portfolio.tsx` works around it with a local `formatSigned`. Use `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })` (adds thousands separators too) and move `formatSigned` into `lib/format.ts`.
- **`lib/api/envelope.ts` `errMessage`** only reads the envelope's `error` field; the schema also declares `message?: string`, which often carries the human-readable text. Fall back `error → message → fallback`.
- **`app/sign-in.tsx`** password input lacks `autoComplete="current-password"` / `textContentType="password"`, so iOS/Android password-manager autofill doesn't engage (email has `autoComplete="email"`).
- **`lib/auth/AuthContext.tsx:53-54`** assigns `accessRef.current`/`refreshRef.current` during render. It works, but writing refs during render is discouraged (unsafe under concurrent rendering); move the mirroring into `applySession`/handlers (most already set the refs explicitly — the render-time assignment is nearly redundant).
- **`components/NotificationBell.tsx`** hardcodes `"#fff"` for badge text instead of a theme token — the only hardcoded color outside `colors.ts`/`CardPriceHistory`'s deliberate chart palette. Use `colors.onAccent` or add an `onDanger` token.
- **`lib/auth/tokenStore.ts`**: `expo-secure-store` warns (and on some Android versions fails) for values over 2 KB. JWTs are usually smaller, but if the backend ever grows claims this breaks persistence silently — worth a size guard or at least awareness.

---

## 2. Duplication (DRY)

This is the largest maintainability drag. Each item below is a copy-paste cluster where a fix or style tweak currently has to be made in N places.

### 2.1 🟡 `nextPage` pagination helper — 6 copies

Identical logic in `app/(tabs)/index.tsx:24`, `app/(tabs)/inventory.tsx:61`, `app/set/[code].tsx:24`, `app/transactions.tsx:30`, `app/deck/add.tsx:25`, `lib/useNotifications.ts:8`. The generic version already exists in `index.tsx` (`nextPage<T>`).

**Recommendation:** export `nextPage<T>` from `lib/api/catalog.ts` (next to `Page<T>`) or a new `lib/api/pagination.ts`, and delete the copies. Pure and trivially unit-testable.

### 2.2 🟡 `InventoryListItem` vs `BuyListListItem` — ~95% identical

`components/InventoryListItem.tsx` and `components/BuyListListItem.tsx` are the same component (thumb + name + set/number + foil badge + price + stepper with trash-at-1) with different item types and stepper sizes (32 px vs 32 px — even those match). Only the accessibility label wording differs.

**Recommendation:** merge into one `CardQuantityRow` taking `{ cardName, cardId, setCode, cardNumber, imgSrc, isFoil, quantity, price, onIncrement, onDecrement, onRemove }`. Both DTOs already share those fields.

### 2.3 🟡 `AddToInventory` vs `AddToBuyList` — ~85% identical, including a wholesale duplicated `FinishStepper`

`components/AddToInventory.tsx` and `components/AddToBuyList.tsx` each define the *same* private `FinishStepper` component and near-identical `createStyles`. The outer components differ only in data source and optimistic-cache shape.

**Recommendation:** extract `FinishStepper` (or a general `QuantityStepper`) into `components/`, and share the card-panel chrome (container/heading/loading/error states). The stepper is also re-implemented inline in `app/deck/[id].tsx`, `BulkAddBar.tsx`, and the merged row from §2.2 — one component with a `size` prop covers all five.

### 2.4 🟡 Segmented controls and chips — 7 hand-rolled copies

The two-button segment (`surface` background, active = `accent`) is re-implemented in `app/(tabs)/watchlist.tsx`, `app/deck/new.tsx`, `app/deck/add.tsx`, `app/account.tsx`, and `components/BulkAddBar.tsx`. The pill "chip" is re-implemented in `app/(tabs)/inventory.tsx`, `app/deck/new.tsx` (private `Chip`), and `components/CardPriceHistory.tsx` (another private `Chip`). All are visually the same control with slightly drifted paddings/font sizes.

**Recommendation:** add `components/SegmentedControl.tsx` and `components/Chip.tsx` (label, active, onPress, optional icon). This removes ~200 lines and makes future design changes single-point.

### 2.5 🟡 Optimistic-mutation boilerplate — 8 copies

The `onMutate` cancel → snapshot → `setQueryData` → return `{ previous }`, `onError` rollback pattern is copy-pasted in `inventory.tsx` (×2), `transactions.tsx`, `notifications.tsx` (×2), `BuyListView.tsx` (×2), `AddToInventory.tsx`, `AddToBuyList.tsx`, and `deck/[id].tsx`.

**Recommendation:** a small generic helper, e.g.:

```ts
// lib/useOptimisticMutation.ts
function useOptimisticMutation<TData, TVars>(opts: {
  queryKey: QueryKey;
  mutationFn: (vars: TVars) => Promise<unknown>;
  apply: (old: TData | undefined, vars: TVars) => TData | undefined;
  errorTitle: string;           // fixes finding 1.3 uniformly
  invalidateOnSettled?: QueryKey[];
})
```

This also gives one place to enforce the settle-time invalidation and error alert conventions (findings 1.3 and 1.6).

### 2.6 🔵 `mapItems` InfiniteData helper — 2 copies

`app/(tabs)/inventory.tsx:53` and `app/notifications.tsx:33` define the same "map every page's items" helper. Move next to the pagination helper from §2.1.

### 2.7 🔵 Route-param normalization — 3 different idioms

`Array.isArray(v) ? v[0] : v` inline (`app/set/[code].tsx`, `app/card/[setCode]/[number].tsx`, `app/deck/add.tsx`), a local `str()` (`app/deck/new.tsx`), and a local `one()` (`app/transaction/new.tsx`). Same job, three names.

**Recommendation:** one `firstParam(v: string | string[] | undefined): string` in `lib/` (or use expo-router's typed params) and use it everywhere.

### 2.8 🔵 Misc small duplications

- Capitalize-first-letter for deck formats appears in `app/(tabs)/decks.tsx`, `app/deck/[id].tsx`, and `app/deck/new.tsx` — add `formatDeckFormat()` to `lib/format.ts`.
- The `useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data])` flatten appears in 6 screens — it can live in a tiny `usePagedItems(query)` hook, or fold into a broader `usePagedList` that also bundles `nextPage`/footer-spinner/refresh-control conventions (see how similar `SetResults` and `CardResults` in `app/(tabs)/index.tsx` already are).
- `const styles = useMemo(() => createStyles(colors), [colors])` is repeated in ~25 files — a one-line `useThemedStyles(createStyles)` hook in `lib/theme/` removes the boilerplate and the awkward `styles`-as-prop drilling in `index.tsx`, `deck/new.tsx`, `card/[setCode]/[number].tsx`, and `CardPriceHistory.tsx`.

---

## 3. Architecture & consistency

### 3.1 🟡 Query keys are only half-centralized

`decks.ts`, `buyList.ts`, `notifications.ts`, and `priceAlerts.ts` export key constants (`DECKS_KEY`, `deckKey`, …) — good. But the other domains use scattered string literals that must stay in sync by convention:

- `["inventory"]` — declared as a local `KEY` in `inventory.tsx`, and as raw literals in `app/set/[code].tsx`, `app/transaction/new.tsx`, `app/transactions.tsx`, and (as a prefix contract) `AddToInventory.tsx`'s `["inventory", "quantities", cardId]`
- `["transactions"]` — local `KEY` in `transactions.tsx`, literal in `transaction/new.tsx`
- `["portfolio", "summary"]` in `portfolio.tsx` vs `["portfolio"]` prefix invalidations in two other files
- `["sets"]`, `["cards","search",q]`, `["card",setCode,number]`, `["set",code,"cards"]`, `["user","profile"]`, `["deck-owned",…]` — inline only

A typo in any literal silently breaks invalidation (exactly the class of bug in finding 1.5).

**Recommendation:** follow the pattern already established: every `lib/api/*.ts` module exports its key(s)/key factories, screens import them, and prefix relationships (e.g. quantities under `["inventory"]`) are visible in one file per domain.

### 3.2 🟡 Layering: data access leaks into presentational components

The codebase has an implicit ports-and-adapters shape — `lib/api/*` are clean adapters (transport + envelope unwrapping only), screens compose UI — but the middle layer is inconsistent. Some data flows live at screen level (`inventory.tsx`, `transactions.tsx`), while `AddToInventory`, `AddToBuyList`, `CardPriceAlert`, `BuyListView`, `PriceAlertsView`, and `NotificationBell` each embed their own queries, mutations, and optimistic-cache surgery inside presentation components. That makes the domain behavior (how quantities upsert, how alerts toggle) untestable without rendering UI, and it's why the same optimistic logic is duplicated (§2.5).

**Recommendation:** introduce a thin hooks layer — `lib/hooks/useInventoryQuantities(cardId)`, `useBuyList()`, `usePriceAlerts()`, etc. — that owns query keys, fetching, and optimistic mutations, and keep components purely presentational (`useNotifications.ts` already models this). Combined with §2.5 and §3.1 this concentrates all cache semantics in `lib/`, which is the hexagonal boundary the codebase is already reaching for.

### 3.3 🔵 "New" screens doing double duty as edit screens

`app/transaction/new.tsx` and `app/deck/new.tsx` both handle editing, with the entity serialized through route params (`id`, `name`, `type`, `quantity`, `price`, `isFoil`, `date`, `notes`, …). This works but is fragile: params are stringly-typed (`one(params.isFoil) === "true"`), can go stale relative to the server, and the route name lies about its purpose.

**Recommendation:** pass only the `id` and read the entity from the query cache (`queryClient.getQueryData`) with a fetch fallback. Optionally rename routes to `transaction/edit/[id]` / keep `new` for creation — clearer navigation semantics and less param plumbing.

### 3.4 🔵 Inconsistent empty/error affordances

- Most screens use `ErrorState` with Retry; `AddToInventory`/`AddToBuyList`/`CardPriceAlert` and the account profile card show plain error text with no retry; `CardPriceHistory` hand-rolls its own retry row. A compact `inline` variant of `ErrorState` would unify these.
- Pull-to-refresh exists on most lists but not the Browse search results footer state or `deck/add` results. Minor, but users notice.

### 3.5 🔵 Dead code

`components/PlaceholderScreen.tsx` is referenced nowhere (its "temporary v1 shell" purpose is complete). Delete it.

### 3.6 🔵 Backend spec smells visible from the client

Not fixable in this repo, but worth backend tickets since they force client workarounds:

- `page`/`limit` on `/notifications` and `days` on price-history are typed `string` in the OpenAPI spec, forcing `String(page)` casts (`lib/api/notifications.ts`, `catalog.ts`) while `/sets`/`/cards` take numbers.
- Absolute-quantity-only writes force the racy read-modify-write in `bulkAddToInventory` (finding 1.6).
- `DeckImportApiResultDto.errors` is specced as `Record<string, never>[]` (an empty-object type) though it carries `{ row, name?, error }` — the deck import screen can only count errors, not display them (the buy-list import DTO gets this right with `string[]`).

---

## 4. Testing & tooling

### 4.1 🔴 No tests and no test infrastructure

There is no test runner, no test files, and no CI test step. Significant, subtle, *pure* logic is untested:

- `lib/auth/jwt.ts` — hand-rolled base64url decode + `exp` extraction (security-adjacent; an off-by-one here breaks proactive refresh silently)
- `lib/auth/AuthContext.tsx` — single-flight refresh, mid-flight session-change guards (the trickiest code in the app)
- `lib/images.ts` — Scryfall URL normalization (has documented edge cases)
- `lib/api/inventory.ts` `bulkAddToInventory` — quantity math
- `components/CardPriceHistory.tsx` `buildSeries` — min/max/current/gap handling (move it to `lib/` so it's importable without rendering)
- `.github/scripts/next-version.sh` — release versioning (a regression here mis-versions a store release)

**Recommendation:** add `jest-expo` + `@testing-library/react-native`, a `npm test` script, and a CI step. Start with the pure modules above (no rendering needed, fast wins), then cover the optimistic-mutation helper from §2.5 once extracted.

### 4.2 🟡 No linter or formatter

Only `tsc --noEmit` runs. ESLint with `eslint-config-expo` + `eslint-plugin-react-hooks` would have flagged real issues found in this review — e.g. the whole `query` object in effect dependency arrays (`lib/useNotifications.ts`, `app/(tabs)/inventory.tsx`), which makes the auto-page effect re-run on every render (currently a guarded no-op, but a footgun). Prettier (or ESLint stylistic rules) would keep the drifting paddings/orderings in check.

**Recommendation:** `npx expo lint` scaffolds this; add `npm run lint` to CI next to typecheck.

---

## 5. Suggested order of attack

| # | Item | Findings | Effort |
|---|------|----------|--------|
| 1 | Clear query cache on sign-out | 1.1 | XS |
| 2 | Fix Browse double inset; silent-rollback alerts; settle-time invalidations | 1.2, 1.3, 1.6 | S |
| 3 | Bell badge → `unread-count`; inbox paginates on scroll | 1.4 | S |
| 4 | Re-key deck-owned under `["inventory", …]`; centralize query keys | 1.5, 3.1 | S |
| 5 | Add ESLint + jest-expo; test `jwt`, `images`, `format`, `nextPage`, `buildSeries` | 4.1, 4.2 | M |
| 6 | Extract shared UI: stepper, card row, chip, segmented control, `useThemedStyles` | 2.2–2.4, 2.8 | M |
| 7 | Extract `useOptimisticMutation` + `lib/hooks/*` layer | 2.5, 3.2 | M |
| 8 | CI: decouple spec-drift check from PR gating | 1.7 | XS |
| 9 | Edit screens read from cache by id instead of param-packing | 3.3 | M |

Items 1–4 are behavior fixes shippable independently; 5 locks in a safety net before the refactors in 6–7 & 9.

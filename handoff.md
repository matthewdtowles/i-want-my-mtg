# Handoff: Progressive Web Enhancement (Phase 1.5)

## Branch

`progressive-web-enhancement` — 5 commits ahead of `main`

## What Was Done

Converted four SSR-only pages to use AJAX for pagination, sorting, and filtering without full page reloads. All changes follow a progressive enhancement pattern: SSR renders the initial page, then client-side JS intercepts interactions and calls `/api/v1/` endpoints.

### Set List (`/sets`)
- `setListAjax.js` — fetch/sort/filter/paginate via `/api/v1/sets`
- URL state management (pushState, replaceState, popstate)
- `setListPage.hbs` wired with container div and deferred script

### Card Search (`/search`)
- `searchAjax.js` — intercepts form submit, parallel card + set API fetches
- Unified single pagination using `Math.max(cardTotal, setTotal)` for total pages
- Pagination rendered as a sibling of `#search-ajax` container (not inside it) to preserve scroll position during content swaps

### Set Card List (`/sets/:code`)
- `setCardListAjax.js` — sort/filter/paginate/baseOnly via `/api/v1/sets/:code/cards`
- Real inventory +/- controls via batch quantities endpoint (`GET /api/v1/inventory/quantities?cardIds=...`)
- Pagination inside `#set-card-list-ajax` container

### Inventory List (`/inventory`)
- `inventoryListAjax.js` — filter/sort/paginate/limit/baseOnly via `/api/v1/inventory`
- Enriched API response with imgSrc, rarity, keyruneCode, prices, tags, url
- Event delegation compatible with `updateInventory.js` for +/- and delete controls
- Pagination as sibling of `#inventory-list-ajax` inside parent `<section>`

### Supporting Changes
- **Toast utility** (`toast.js`) — extracted `window.showToast`/`window.dismissToast` from navbar.hbs inline script; used by `updateInventory.js` for error feedback
- **Batch quantities endpoint** — `GET /api/v1/inventory/quantities?cardIds=...` returns foil/normal quantities per card
- **Enriched inventory API** — `InventoryApiPresenter` maps full display fields; `card.set` join added to repository
- **Card API** — added `keyruneCode` field via presenter
- **Set API** — added `filter`, `baseOnly` query params; tags and parentCode in response
- **Set type mapper** — moved to `src/http/base/set-type.mapper.ts` (shared between HBS and API)

## Key Architecture Decisions

### Pagination Placement Pattern
All AJAX pages follow the same pattern: results container gets its `innerHTML` replaced, pagination is a **separate sibling element** updated independently. This prevents scroll position jumps during content swaps. The `pinHeight`/`unpinHeight` utility sets `min-height` on the container before fetch to prevent layout shift.

- `search.hbs`: pagination outside `#search-ajax`, scoped via `container.parentElement.contains()`
- `set.hbs`: pagination inside `#set-card-list-ajax`, scoped via `container.contains()`
- `inventory.hbs`: pagination sibling of `#inventory-list-ajax`, scoped via `container.parentElement.contains()`

### SSR onchange Removal
The `pagination.hbs` partial has `onchange="this.form.submit()"` on the limit select. `HTMLFormElement.submit()` bypasses DOM events, so AJAX modules cannot intercept it. Each AJAX module strips this attribute on DOMContentLoaded: `ssrLimitSelect.removeAttribute('onchange')`.

### Event Delegation Scoping
All AJAX modules use delegated event listeners on `document` and scope them using `container.contains()` or `container.parentElement.contains()` to avoid cross-page interference. `Element.closest()` only walks ancestors, so CSS sibling selectors inside `closest()` do not work.

## Files Changed (vs main)

| File | Change |
|------|--------|
| `src/http/public/js/setListAjax.js` | New: set list AJAX |
| `src/http/public/js/searchAjax.js` | New: search AJAX |
| `src/http/public/js/setCardListAjax.js` | New: set card list AJAX |
| `src/http/public/js/inventoryListAjax.js` | New: inventory list AJAX |
| `src/http/public/js/toast.js` | New: global toast utility |
| `src/http/public/js/updateInventory.js` | Added toast calls on errors |
| `src/http/views/setListPage.hbs` | Added container div + script |
| `src/http/views/search.hbs` | Added section IDs, unified pagination (moved outside `#search-ajax`) |
| `src/http/views/set.hbs` | Added container div + script, moved pagination inside container |
| `src/http/views/inventory.hbs` | Added container div + script |
| `src/http/views/partials/navbar.hbs` | Refactored to use toast.js |
| `src/http/hbs/search/search.orchestrator.ts` | Unified pagination (max of card/set totals) |
| `src/http/hbs/search/dto/search.view.dto.ts` | Single `pagination` field |
| `src/http/hbs/set/set.orchestrator.ts` | Minor adjustment for card API fields |
| `src/http/api/card/card-api.presenter.ts` | Added keyruneCode mapping |
| `src/http/api/card/dto/card-response.dto.ts` | Added keyruneCode field |
| `src/http/api/set/set-api.controller.ts` | Added filter, baseOnly query params |
| `src/http/api/set/set-api.presenter.ts` | Added tags, parentCode mapping |
| `src/http/api/set/dto/set-response.dto.ts` | Added tags, parentCode fields |
| `src/http/api/inventory/inventory-api.controller.ts` | Added quantities endpoint, use presenter |
| `src/http/api/inventory/inventory-api.presenter.ts` | New: presenter with enriched mapping |
| `src/http/api/inventory/dto/inventory-response.dto.ts` | Added enriched display fields |
| `src/http/api/inventory/dto/inventory-quantity.dto.ts` | New: batch quantity DTO |
| `src/http/base/set-type.mapper.ts` | Moved from hbs/set/ to shared location |
| `src/database/inventory/inventory.repository.ts` | Added card.set join in findByUser |
| `src/http/public/css/tailwind.css` | Compiled CSS updates |

### Tests
| File | Change |
|------|--------|
| `test/http/api/card/card-api.presenter.spec.ts` | keyruneCode tests |
| `test/http/api/set/set-api.presenter.spec.ts` | Tags/parentCode tests |
| `test/http/api/set/set-api.controller.spec.ts` | Filter/baseOnly tests |
| `test/http/api/inventory/inventory-api.presenter.spec.ts` | New: enriched mapping + quantity tests |
| `test/http/search/search.orchestrator.spec.ts` | Unified pagination tests |
| `test/integration/api-cards.e2e-spec.ts` | keyruneCode integration test |
| `test/integration/api-sets.e2e-spec.ts` | Filter/baseOnly integration tests |
| `test/integration/api-inventory.e2e-spec.ts` | Enriched fields + quantities tests |

## Test Status

- **Unit tests**: 706 passing (`npm test`)
- **Integration tests**: Not run in this session (require Docker/PostgreSQL via `./scripts/test-integ.sh`)

## What's Left in Phase 1.5

- [ ] Transaction list AJAX conversion (`/transactions`)
- [ ] Cross-browser testing for all AJAX pages

## Known Patterns / Gotchas

1. **`HTMLFormElement.submit()` bypasses DOM events** — any SSR `onchange="this.form.submit()"` must be stripped by the AJAX module
2. **`Element.closest()` only walks ancestors** — never use CSS sibling selectors (`~`, `+`) inside `closest()`
3. **`updateInventory.js` and `cardPreview.js` use `document.body` event delegation** — they work automatically with AJAX-rendered content as long as form HTML structure matches exactly
4. **Pagination must be outside the results container** — replacing `container.innerHTML` with pagination inside causes scroll jumps; keep pagination as a sibling updated separately

# Handoff: Roadmap 2.9 — Site Copy, UX Guidance & Font Overflow

**Branch:** `update-site-copy-and-guides`
**Roadmap item:** 2.9 Improve Site Copy and UX Guidance
**Status:** Complete ✅

---

## What Was Done

### 1. Fluid Typography & Font Overflow Fixes (`src/http/styles/tailwind.css`)

**Problem:** Price tiles on the card page used `@apply truncate` (which applies `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`), causing prices to be cut off with "…" instead of shrinking. Same issue existed with `page-title` and `stat-value` using fixed Tailwind size classes.

**Fix:**
- `.price-tile-active .price-tile-value` — removed `@apply truncate`, added `overflow-wrap: break-word; word-break: break-all`. Already had `clamp(1rem, 2.5vw, 1.875rem)`.
- `.price-tile-inactive .price-tile-value` — same.
- `.page-title` — replaced fixed `text-2xl` with `font-size: clamp(1.25rem, 3vw, 1.5rem)` + `overflow-wrap: break-word`.
- `.card-title` — same treatment as page-title.
- `.stat-card` — added `min-width: 0` to prevent flex overflow.
- `.stat-value` — replaced `text-lg` with `font-size: clamp(0.875rem, 1.75vw, 1.125rem)` + `overflow-wrap: break-word; word-break: break-word; min-width: 0`.

### 2. Welcome Banner (`src/http/views/partials/navbar.hbs`)

**Problem:** The welcome banner after account creation was a dead end — no CTAs, cold copy.

**Fix:**
- Warmer headline: "Welcome to I Want My MTG!"
- Clearer body: guides user to browse sets OR import a CSV
- Three action buttons: **Browse Sets** (primary), **Import from CSV** (secondary), **Getting Started Guide** (ghost)

### 3. Home Page Hero (`src/http/views/home.hbs`)

**Problem:** Three bare feature labels ("Track your collection", "Discover set values", "Manage your inventory") gave no indication of depth or value.

**Fix:** Added a descriptive tagline paragraph below the h1, and improved the three feature callouts with icons and more specific descriptions ("Watch your portfolio value", "Log buys, sells & gains").

### 4. Inventory Empty State (`src/http/views/inventory.hbs`)

**Problem:** Empty collection showed one CTA ("Browse Sets") with no path for users who have an existing list to import. Filter empty state said "Clear Filters" (action-focused) instead of outcome-focused.

**Fix:**
- Heading changed from `{{username}}'s collection is empty` → "Your collection is empty" (more neutral, less personal-data exposure in heading)
- Two CTAs: **Browse Sets** and **Import from CSV**
- "New here?" hint with link to Getting Started guide
- Import action card copy: "Import & Export" → "Import Your Collection" with explanatory subtext
- Filter empty state button: "Clear Filters" → "Show All Cards"

### 5. Set List Empty State (`src/http/views/partials/setList.hbs`)

- Button: "Clear Filter" → "Show All Sets" (outcome-focused)

### 6. Import & Export Guide (`src/http/views/importExportGuide.hbs`)

- Fixed heading hierarchy: `h4` → `h2`, `h5` → `h3` (semantic HTML)
- Back link: "Back to Inventory" → "Return to My Inventory"

### 7. Getting Started Guide (new page)

**Files created/changed:**
- `src/http/views/gettingStarted.hbs` — new template
- `src/http/hbs/home/home.controller.ts` — added `GET /guides/getting-started` route using `OptionalAuthGuard`

**Guide content (6 steps):**
1. What Is This App — overview of Inventory, Transactions, Portfolio, Sets
2. Adding Cards — browse & add one at a time vs. CSV import
3. Finding a Specific Card — search bar usage
4. Logging Buys & Sells — transaction form, cost basis explanation
5. Understanding Your Portfolio — definition of each metric (Current Value, Invested, Unrealized P&L, Realized Gains, ROI)
6. Binder View — how to access the binder icon
7. Tips & Shortcuts — hover preview, long-press, base-only toggle, dark mode, arrow keys

### 8. Navigation (`src/http/views/partials/navbar.hbs`)

- Added `?` icon link (`/guides/getting-started`) in desktop nav — icon-only with `sr-only` "Help" label, `title` tooltip. Non-obtrusive for power users.
- Added "Getting Started" text link in mobile menu.

---

## What Remains / Future Sessions

### Contextual First-Visit Hints (Not Done — Out of Scope for This Session)

The research identified these as high-value but they require client-side `localStorage` gating:

- **Binder view discovery:** One-time tooltip on the `.binder-link` icon the first time a user visits their inventory: "View as a binder — flip through your cards page by page." Dismiss stores key in `localStorage`.
- **Portfolio metric hints:** First-visit subtle pulsing ring on each stat card with a dismissible `?` that explains the metric.
- **Import hint on transactions page:** If user has transactions but no imports, show a dismissible inline tip about CSV import.

Implementation pattern: Add to the relevant JS file (`inventoryListAjax.js`, `portfolioChart.js`) a `localStorage.getItem('hint_binder_seen')` check.

### Guided Tooltip for Cost Basis Methodology (Partial)

The existing `costBasisTooltip.hbs` is good but only visible on the card detail page. Consider surfacing a simplified version on the Portfolio page header for users who haven't seen it.

### "Transactions" Nav Label

Research suggested "Purchase History" is clearer for new users, but "Transactions" is the established technical term and was kept to avoid confusion for existing users. Revisit if user testing shows confusion.

### Other Pages to Audit

- `portfolio.hbs` — refresh button copy could be more descriptive ("Recalculate P&L")
- `transactions.hbs` — "Transactions" heading could have a subtitle explaining what transactions are for
- Error pages (401, 404, 500) — could be more helpful and brand-consistent
- `spoilers.hbs` — page could benefit from a brief description of what "spoilers" means in context

### Build & Deploy

No backend logic changed (only the new `GET /guides/getting-started` route was added). CSS changes require a rebuild:

```bash
docker compose build web && docker compose up -d web
```

The new route is public (no auth required) and uses `OptionalAuthGuard` so the navbar auth state renders correctly.

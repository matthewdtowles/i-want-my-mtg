# Plan: Accessibility (2.5) & SEO (2.6) Improvements

## Context
Completing the remaining items in roadmap sections 2.5 (Accessibility) and 2.6 (SEO). The app already has basic meta tags, semantic HTML landmarks, focus rings on buttons, and a robots.txt. This plan addresses color contrast failures blocking Lighthouse 100, keyboard/screen-reader gaps, and missing SEO signals (OG tags, structured data, sitemap, canonical URLs).

---

## Part 1: Accessibility (2.5)

### 1.1 Fix Color Contrast
**File:** `src/http/styles/tailwind.css`

- `.btn-primary` (line 22): Light mode `bg-teal-500` (#14b8a6, ~2.9:1) fails WCAG AA. Change to `bg-teal-700`, hover to `hover:bg-teal-800`. Dark mode stays `dark:bg-teal-500` (fine on dark bg).
- `.btn-secondary` (line 27): Light mode `bg-purple-600` (#9333ea, ~3.9:1) fails. Change to `bg-purple-700`, hover to `hover:bg-purple-800`. Dark mode unchanged.
- `.header-subtitle` (line 571): Dark mode `dark:text-gray-400` is low contrast on `dark:bg-midnight-700`. Change to `dark:text-gray-300`.

### 1.2 Skip-to-Content Link
**File:** `src/http/views/layouts/main.hbs`
- Add `<a href="#main-content" class="skip-link">Skip to main content</a>` as first child of `<body>`.
- Add `id="main-content"` to `<main>`.

**File:** `src/http/styles/tailwind.css`
- Add `.skip-link` class: visually hidden (sr-only), on focus becomes visible fixed overlay at top-left with high z-index and styled button appearance.

### 1.3 Global Focus-Visible Fallback
**File:** `src/http/styles/tailwind.css`
- Add base layer rule: `*:focus-visible { outline: 2px solid theme('colors.teal.500'); outline-offset: 2px; }` to catch any interactive element without explicit focus styles.

### 1.4 Keyboard Navigation for Card Preview
**File:** `src/http/public/js/cardPreview.js`
- Add `focusin`/`focusout` listeners alongside existing `mouseover`/`mouseout` in `init()`. When a `.card-name-link[data-card-img]` receives focus, show preview; on blur, hide it.

### 1.5 Card Image Modal Focus Management
**File:** `src/http/public/js/cardImageModal.js`
- Save `document.activeElement` as `triggerElement` on `open()`.
- Move focus to close button after opening.
- On `close()`, return focus to `triggerElement`.
- Add Tab/Shift+Tab trapping within modal when active (close button is the only focusable element, so Tab stays on it).

### 1.6 Mobile Menu ARIA
**File:** `src/http/views/partials/navbar.hbs`
- Add `aria-expanded="false"` and `aria-controls="mobile-menu"` to `#mobile-menu-button`.

**File:** `src/http/views/partials/navbar.hbs` (inline script)
- Toggle `aria-expanded` in the click handler.

### 1.7 ARIA Live Region for AJAX Content
**File:** `src/http/views/layouts/main.hbs`
- Add `<div id="aria-live-announcer" class="sr-only" aria-live="polite" aria-atomic="true"></div>` before `</body>`.

**File:** `src/http/public/js/ajaxUtils.js`
- Add `announce(message)` function: clears text, then after 100ms sets `textContent` on `#aria-live-announcer`.
- Call `announce()` after successful render in `initListPage`'s `fetchAndRender` with format like "Showing X of Y results".

**File:** `src/http/public/js/searchAjax.js`
- Call `AjaxUtils.announce()` in `renderResults()` with card/set counts.

---

## Part 2: SEO (2.6)

### 2.1 Extend BaseViewDto
**File:** `src/http/base/base.view.dto.ts`
- Add fields: `ogImage?: string`, `canonicalUrl?: string`, `jsonLd?: string`.

### 2.2 Add Meta Tags to Layout
**File:** `src/http/views/layouts/main.hbs` (in `<head>`, after robots tag)
- Conditional OG tags block (gated on `indexable`): `og:title`, `og:description`, `og:type` ("website"), `og:image`, `og:url`, `og:site_name` ("I Want My MTG").
- Conditional `<link rel="canonical">` (gated on `canonicalUrl`).
- Conditional `<script type="application/ld+json">{{{jsonLd}}}</script>` (gated on `jsonLd`).

### 2.3 JSON-LD Utility
**New file:** `src/http/base/json-ld.util.ts`
- `buildBreadcrumbJsonLd(appUrl, breadcrumbs)` — BreadcrumbList schema from existing breadcrumb data.
- `buildCardJsonLd(appUrl, card)` — Product schema with name, image, description (oracle text), brand (Magic: The Gathering), and Offer with normal price.
- `buildJsonLd(...schemas)` — combines multiple schemas into a single JSON string.

### 2.4 Set SEO Data in Controllers
Inject `ConfigService` to get `APP_URL` (same pattern as `email.service.ts`).

**File:** `src/http/hbs/home/home.controller.ts`
- Set `canonicalUrl`, `ogImage` (logo).

**File:** `src/http/hbs/card/card.controller.ts`
- Set `canonicalUrl`, `ogImage` (card image), `jsonLd` (Product + BreadcrumbList).

**File:** `src/http/hbs/set/set.controller.ts`
- Set `canonicalUrl` on both `/sets` and `/sets/:code`. `ogImage` on set detail (first card image or logo fallback).

**File:** `src/http/hbs/set/spoilers.controller.ts`
- Set `canonicalUrl`.

### 2.5 Sitemap
**New file:** `src/http/hbs/sitemap/sitemap.controller.ts`

Sitemap index approach to avoid loading all cards at once:
- `GET /sitemap.xml` — index pointing to `/sitemap-static.xml` + `/sitemap-sets-{code}.xml` per released set.
- `GET /sitemap-static.xml` — `/`, `/sets`, `/spoilers`, all `/sets/{code}`.
- `GET /sitemap-sets-:code.xml` — all `/card/{setCode}/{number}` for one set.

Inject `SetService` and `CardService`. Cache-Control: `public, max-age=86400`.

**File:** `src/http/hbs/hbs.module.ts`
- Register `SitemapController`.

### 2.6 Update robots.txt
**File:** `src/http/hbs/home/home.controller.ts`
- Inject `ConfigService`, append `Sitemap: {appUrl}/sitemap.xml` line.

---

## Implementation Order
1. CSS fixes (contrast, skip-link style, focus-visible)
2. Template changes (main.hbs: skip link, ARIA live region, OG/canonical/JSON-LD; navbar.hbs: ARIA)
3. JS changes (cardPreview focus, modal focus trap, AJAX announcements)
4. Backend (BaseViewDto, json-ld.util, controller updates, SitemapController, robots.txt update)
5. Rebuild CSS + run tests + Lighthouse verification

## Verification
- `npm run build:css` to rebuild Tailwind
- `npm test` for unit tests
- `docker compose build web && docker compose up -d web` to test locally
- Lighthouse audit on card, set, home pages (target: 100 accessibility, improved SEO)
- Tab through all pages verifying focus visibility and skip link
- Check `/sitemap.xml`, `/robots.txt` in browser
- Validate JSON-LD at https://validator.schema.org (manual)

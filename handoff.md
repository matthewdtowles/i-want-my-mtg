# Performance Optimization Handoff

## What Was Done

### Session 1: Local Lighthouse Optimization (all scores to 95+ locally)

- **Deferred font preloads** — Removed eager `<link rel="preload">` for keyrune and Font Awesome fonts that were competing with CSS on slow 4G. Fonts now load naturally when their deferred CSS activates.
- **Lazy-loaded Chart.js** — Created `chartLoader.js` using IntersectionObserver to load Chart.js only when a chart scrolls into view (was 72KB blocking on every card/set page).
- **Prefetch throttling** — Added slow-connection detection (`navigator.connection.effectiveType`) to skip eager nav-link prefetching on non-4G connections.
- **LCP preloads** — Added `lcpImageUrl` to card-detail and home pages for `<link rel="preload">` of the largest contentful paint element.
- **Image optimization** — Converted logo and background to WebP. Added `width`/`height`, `loading="lazy"`, `fetchpriority` attributes across all images.
- **CSS reduction** — Fixed Tailwind content paths (200KB -> 122KB), removed unused plugin, added `--minify`.
- **Build pipeline** — Created separate dev/prod asset pipelines: source stays readable, Terser + Tailwind `--minify` run only in Docker production build. JS minified to `dist/http/public/js/`, CSS to `dist/http/public/css/`.
- **CLS fixes** — Added CSS placeholders for `.ss` (keyrune) and `.ms` (mana) icon classes to reserve space before deferred CSS loads.
- **SEO** — Added dynamic `<title>`, `<meta description>`, and `robots` directives to all public pages.
- **Accessibility** — Fixed heading hierarchy, added `aria-label` to icon-only buttons, fixed color contrast issues.
- **Best Practices** — Fixed CORS errors from protocol-relative URLs, added favicon.

### Session 2: Production Optimization (this session)

After deploying to production, scores dropped significantly due to issues not visible locally.

**Changes made:**

1. **Self-hosted mana-font with woff2** — The CDN CSS only declares `woff` (408KB). Downloaded `mana.woff2` (187KB, 54% smaller) and created local CSS with woff2 as primary format. Updated `card.hbs` and `set.hbs`.
   - New files: `src/http/public/fonts/mana.woff2`, `src/http/public/css/mana.css`

2. **CLS fix (set-detail)** — Updated `.ss` and `.ms` placeholders in `app.css` to match the full computed styles of keyrune/mana-font CSS, including `font` shorthand, `text-rendering`, `transform`, and `::before` pseudo-element. Desktop CLS: 0.291 -> 0, Mobile: 0.144 -> 0.001.

3. **Prefetch delay** — Added 3-second `setTimeout` before eager nav-link prefetching. Lighthouse uses simulated throttling (real connection stays fast), so `effectiveType === '4g'` and all 7 nav links (281KB) were prefetched during critical window.

4. **Logo optimization** — Resized from 1072x992px (55KB) to 160x160px (4KB). Displayed at 80x80 with 2x retina coverage.

5. **Removed solo jazz background image** — Eliminated 21KB background image load and its preload from the home page.

6. **Lighthouse prod script** — Added `npm run lighthouse:prod` to run audits against `https://iwantmymtg.net` without passing URLs.

7. **Updated card-detail test page** — Changed from `/card/fdn/176` to `/card/ecl/273` for more complete page feature coverage.

## What Still Needs to Be Done

### Critical: HTML Compression in Production (Infrastructure)

**This is the highest-impact remaining fix.** HTML responses from production are served uncompressed (42-140KB). Static files get brotli from CloudFront, but dynamic HTML does not. The Express `compression()` middleware works correctly (confirmed locally), but something in the CloudFront -> Lightsail path strips or bypasses it.

**Action items:**
- In CloudFront distribution: verify "Compress Objects Automatically" is enabled for HTML paths
- Ensure the cache policy includes `Accept-Encoding` in the cache key
- Verify the origin request policy forwards `Accept-Encoding` to the origin

**Estimated savings:**

| Page | Uncompressed | ~Gzipped | Savings on 4G |
|------|-------------|----------|---------------|
| home | 42KB | ~9KB | ~165ms |
| sets | 43KB | ~9KB | ~170ms |
| set-detail | 140KB | ~25KB | ~575ms |
| search | 46KB | ~10KB | ~180ms |
| card-detail | 45KB | ~10KB | ~175ms |

### Remaining Lighthouse Issues (non-performance)

**SEO (66 on search + login):**
- Both pages have `<meta name="robots" content="noindex">` — Lighthouse flags this as "blocked from indexing"
- This is intentional for login. For search, consider whether search results pages should be indexable.

**Accessibility (95-96 on most pages):**
- Color contrast failures on `btn-secondary` and `header-subtitle` (most pages)
- Color contrast failure on `btn-primary` (login page)

**Best Practices (96 on search mobile):**
- Minor issue, likely third-party related

## Current Scores

### Local (post-optimization, perf-only run)

| Page | Mobile | Desktop |
|------|--------|---------|
| home | 100 | 100 |
| sets | 100 | 100 |
| set-detail | 100 | 100 |
| search | 97 | 99 |
| card-detail | 91 | 99 |
| spoilers | 100 | 100 |
| login | 100 | 100 |

### Production (pre-optimization baseline)

| Page | Mobile Perf | Desktop Perf | A11y | BP | SEO |
|------|------------|-------------|------|-----|-----|
| home | 81 | 100 | 96 | 100 | 100 |
| sets | 91 | 100 | 96 | 100 | 100 |
| set-detail | 74 | 85 | 96 | 100 | 100 |
| search | 81 | 98 | 96 | 96 | 66 |
| card-detail | 65 | 99 | 96 | 100 | 100 |
| spoilers | 100 | 100 | 100 | 100 | 100 |
| login | 100 | 100 | 95 | 100 | 66 |

### Expected Production (after deploy + CloudFront fix)

All performance scores 95+ mobile and desktop. Card-detail may land 90-95 due to external Scryfall card image (LCP element) latency.

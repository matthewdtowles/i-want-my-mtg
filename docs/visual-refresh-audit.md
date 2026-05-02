# Visual Refresh Audit (§2.14)

Concrete deltas between current site chrome / surfaces / typography and the pricing page's design language. Inputs: `src/http/views/layouts/main.hbs`, `partials/navbar.hbs`, `partials/footer.hbs`, `src/http/views/pricing.hbs`, `src/http/styles/tailwind.css`, `tailwind.config.js`.

Reference: the **shipped `/pricing` page** is the in-codebase target. The original Claude design artifact (`Pricing Page.html`) is the broader design language reference; some of its chrome (e.g. its own gradient navbar and tri-column footer) is not yet in `main.hbs`.

## 1. Color tokens — already global

`tailwind.config.js` already defines `midnight`, `teal`, `purple`, `hotpink` palettes globally. The pricing page CSS uses literal hex values (`#2cc8ca`, `#a95de0`) that match `teal-500` / `purple-500`. **No token promotion needed** — replace literal hexes in `tailwind.css` with `theme('colors.teal.500')` etc. for consistency. Roadmap bullet "Promote the page-scoped color tokens to global Tailwind theme tokens" is partially obsolete; reframe as *normalize literal hex usage to the shared tokens*.

Gap: no `amber` token in config, but pricing page references amber (Upgrade CTA `bg-amber-500`, "Coming soon" text). Add `amber` palette to config, or pin existing Tailwind default amber.

## 2. Typography — Space Grotesk already loaded; body stack is system

`main.hbs:52` loads `Space Grotesk` site-wide; `tailwind.config.js` exposes `font-display` (Space Grotesk) and `font-body` (system). Body uses `font-body`. Pricing page CSS adds `font-family: inherit` on form elements and `text-wrap: balance` / negative `letter-spacing` for display headings.

**Decision needed:** keep body on system stack (faster render, native feel) vs. switch body to Space Grotesk too (visual unity with pricing-page tone). The pricing page sets `.pricing-page { font-display }` at the wrapper level, so its body text is also Space Grotesk. **Recommend body Space Grotesk site-wide** — page is already loading the font, and uniform display=body matches the pricing tone.

Display heading deltas (current vs. pricing):
- `.page-title`: `clamp(1.25rem, 3vw, 1.5rem)`, no letter-spacing, 3-color gradient text.
- `.pricing-hero-title`: `clamp(2.2rem, 6vw, 3.5rem)`, `letter-spacing: -0.03em`, `line-height: 1.1`, `text-wrap: balance`, 2-color gradient on emphasized line only.
- Site lacks negative letter-spacing on display type. Page titles are far smaller than pricing's hero title (intentional for non-marketing pages, but still feel undersized).

## 3. Navbar (`partials/navbar.hbs`)

**Current:**
- Solid purple/midnight gradient bg, `border-b-2 border-teal-400`, `shadow-lg`
- Logo (left) + (premium badge OR amber Upgrade CTA) + theme toggle + hamburger (right)
- Drawer hidden by default, opens on hamburger click — works at all breakpoints (no horizontal desktop nav)
- Search input lives inside the drawer
- Toast notification element rendered alongside

**Target language (pricing page tone + design artifact):**
- Gradient-bordered navbar (refined; less heavy shadow)
- Drawer menu (already have)
- Likely: surface 3–5 primary nav links horizontally on desktop (Sets / Inventory / Portfolio / Transactions / Alerts) so authenticated users don't always have to open the drawer for top-level routes
- Search affordance more prominent (today: hidden in drawer)

**Concrete deltas to resolve in design:**
- Should desktop ≥ md show inline nav links, with the drawer reserved for secondary items (Account, Subscription, Logout, Help)?
- Should the search input promote to the navbar bar at desktop widths instead of being drawer-only?
- Premium badge / Upgrade button: keep amber pill, or restyle to teal→purple gradient like `.pricing-btn-cta`?
- Border / shadow: replace `border-b-2 border-teal-400 + shadow-lg` with a gradient hairline (`bg-gradient-to-r from-teal-500/40 via-purple-500/40 to-teal-500/40`, h-px) like a subtle separator?

## 4. Footer (`partials/footer.hbs`)

**Current:**
- Top gradient bar `from-teal-400 via-purple-500 to-hotpink-500` (h-1)
- Solid `bg-purple-900 dark:bg-midnight-950`
- Centered single-column: links row, credit, WotC disclaimer, affiliate disclaimer

**Target ("color-bar + tri-column"):**
- Keep gradient color bar (already there)
- Three columns at desktop: e.g. **Product** (Pricing, Getting Started, Sets, Spoilers) | **Account** (Login / Sign up / Billing) | **Legal** (Privacy, Terms, WotC disclaimer, affiliate disclosure)
- Brand block / logo on the left, links to the right (or reverse)
- Lighter background option to match pricing's softer palette (or keep current dark for contrast — design call)

**Concrete deltas to resolve in design:**
- Final column structure (3 vs. 4 vs. brand-left + 3 columns)
- Brand block content (logo + tagline? "Made by mdt"?)
- Whether to keep the dense disclaimer text in fine print at the bottom or fold WotC into Legal column

## 5. Buttons — two systems, need reconciliation

**Site:**
```
.btn-primary    → bg-teal-700 solid + glow shadow on hover (rounded-lg)
.btn-secondary  → bg-purple-700 solid
.btn-danger     → bg-hotpink-500 solid
.btn-ghost      → transparent w/ teal text
```

**Pricing:**
```
.pricing-btn-cta   → linear-gradient(teal-500 → blue-ish), dark text, soft glow shadow
.pricing-btn-ghost → transparent + gray text + border
```

The pricing CTA's gradient + dark-text-on-light-gradient is more refined than the solid teal-700 site button. The mismatch is most visible on `/billing`, `/billing/success` (which use both). Recommendation: promote a `.btn-cta` variant matching `.pricing-btn-cta` and start replacing primary CTAs with it where context warrants (signup, checkout, "Manage subscription", upgrade prompts). Keep `.btn-primary` for in-app secondary actions (search, save, submit) where the gradient would feel too heavy.

## 6. Surfaces (cards, panels, stat tiles)

**Site:**
- `.section-container`: `bg-white dark:bg-midnight-800`, `border-gray-200 dark:border-midnight-600`, `rounded-lg` (8px)
- `.stat-card`: same base
- `.welcome-banner`: `border-l-4 border-teal-400` accent
- Form containers use `border-t-4 border-teal-400` accent
- Generally `rounded-lg` everywhere, accent stripes via colored borders

**Pricing:**
- `.pricing-card`: `rounded-2xl` (16px), deeper dark bg `dark:bg-midnight-900`, `border-gray-200 dark:border-midnight-700`
- `.pricing-card.featured`: subtle gradient wash + soft outer glow + inset highlight
- Larger padding (`p-8` vs site's `p-6`)
- More generous radii give a softer, more premium feel

**Concrete deltas to resolve in design:**
- Standard surface radius: stay at `rounded-lg` or move to `rounded-xl` / `rounded-2xl` site-wide? (Bigger radius = friendlier, but mismatched against tables and dense data views.)
- Standard surface dark bg: `midnight-800` (current) vs. `midnight-900` (pricing)? Pricing is darker and richer.
- "Featured" surface treatment: should portfolio breakdown rows / premium upgrade tiles / billing success cards adopt the gradient-wash pattern from `.pricing-card.featured`?

## 7. Hero / page header treatments

**Site (home, portfolio, inventory, set, card detail, search):**
- Most pages use `.page-title` (small gradient-clipped heading, mb-4) and dive straight into content
- Home has a real hero (gradient bg + tagline + 3 feature callouts + mana color bar)
- Portfolio has a stats strip header
- Card detail has the LCP image hero
- Inventory / set / search have minimal headers

**Pricing:**
- Full hero with radial-gradient ambient bg, badge pill, large 2-line title, balanced subtitle, CTA element below
- Distinctly more "marketing"-shaped

**Concrete deltas to resolve in design:**
Marketing-style heroes do not fit every authenticated page. Per-page hero treatments to design:
- **Home (`/`)**: enhance existing hero toward pricing tone (radial ambient, bigger title, refined feature callouts)
- **Portfolio (`/portfolio`)**: data-shaped header (current value stat is the "hero"); how does it absorb pricing's typography rhythm without becoming marketing-shaped?
- **Inventory (`/inventory`)**: utility page; minimal header is correct, but typography + filter/control surfaces should match
- **Set list / set detail / card detail / search**: similar — utility headers, but typography and surface treatment should reconcile

## 8. Effects and motion

- Pricing uses radial gradients for ambient depth; site uses linear gradients only
- Pricing uses soft outer glows + inset highlights on featured cards
- Site uses crisp `shadow-md` / `shadow-lg` and `shadow-glow-teal` (already configured for hover)
- Site has `prefers-reduced-motion` discipline already (binder, card image, modal)

No major motion gap, but ambient radial backgrounds should be added to home hero (and possibly billing success / upgrade tiles) to match pricing depth.

## 9. Other observations

- The mana color bar (`<div class="mana-color-bar">`) below the home hero is unique to home — consider whether it stays as a home-only flourish or shows up elsewhere as a section divider
- Toast / response message system is solid and likely doesn't need refresh
- Welcome banner uses `border-l-4` accent — could move to the gradient-wash pattern from pricing
- Form containers use top accent stripes — consistent and probably fine to keep

## 10. Roadmap §2.14 reconciliation

These bullets need adjusting based on the audit:

- ~~"Promote the page-scoped color tokens to global Tailwind theme tokens"~~ → reframe: *Normalize literal hex usage in `tailwind.css` to the existing global tokens* (and add `amber` token).
- "Decide on font" → narrowed: **stay on system body** vs. **adopt Space Grotesk for body**. Recommendation above is the latter.
- "Audit current site chrome" → done (this doc).
- The remaining bullets stand as written.

---

# Prompts to give Claude design

When ready to generate designs, use these prompts. Each is self-contained — Claude design won't have this audit. Attach screenshots of the relevant current page when you can.

## Prompt 1 — Navbar redesign

I'm refreshing the global navbar of my Magic: The Gathering collection tracker (NestJS + Handlebars + Tailwind). The site has a polished `/pricing` page with a refined visual direction (midnight/teal/purple gradient palette, Space Grotesk display, soft gradients, generous radii) and I want the navbar to match that tone.
>
**Current navbar** (mobile-first drawer at all breakpoints — no horizontal desktop nav):
- Solid purple→midnight gradient bar with bottom teal border
- Logo left; theme toggle + hamburger right
- On authenticated users: "Premium" badge OR amber "Upgrade" CTA between logo and theme toggle
- Drawer holds: search input, then routes (Home, Sets, Spoilers, Pricing OR My Inventory/Portfolio/Transactions/Alerts/Account/Subscription/Logout, Getting Started)
>
**Goals:**
- Surface 3–5 primary routes horizontally on desktop (≥ md) so authenticated users don't always open the drawer for top-level navigation. Drawer becomes secondary (Account, Subscription, Logout, Help).
- Promote the search input to a visible navbar element on desktop (currently hidden in drawer)
- Replace heavy bottom border + shadow with a refined separator (e.g. gradient hairline)
- Keep theme toggle, premium badge, upgrade CTA visible
- Match the pricing page's typography rhythm and color depth
>
**Constraints:**
- Authenticated and unauthenticated states must both work
- Premium badge and amber Upgrade CTA states must persist
- Mobile (< md) keeps the drawer-only pattern
- Theme toggle (light/dark) must remain prominent and accessible
>
Produce: a single HTML+inline-style design page demonstrating the navbar in (a) desktop unauthenticated, (b) desktop authenticated free-tier, (c) desktop authenticated premium, (d) mobile collapsed, (e) mobile drawer open. Match the typography and palette of the existing `/pricing` page.

## Prompt 2 — Footer redesign

Redesign the site footer to a "color bar + tri-column" treatment that matches the `/pricing` page's visual language (midnight/teal/purple, Space Grotesk display, soft palette).

**Current footer:**
- 1px gradient color bar (teal → purple → hotpink)
- Solid purple-900/midnight-950 background
- Centered single-column: links row (Pricing, Privacy, Terms, Getting Started), then credit "I Want My MTG! ☆ mdt", then WotC disclaimer, then affiliate disclaimer

**Goals:**
- Keep the gradient color bar at top
- Three (or four) columns at desktop: brand block + Product (Pricing, Sets, Spoilers, Getting Started) + Account (Login / Sign up / Billing) + Legal (Privacy, Terms)
- Move WotC fan-content disclaimer and affiliate disclaimer to small print at the bottom
- Stack to a single column on mobile
- Match pricing-page typography and softness

Produce: HTML+inline-style design at desktop and mobile breakpoints.

## Prompt 3 — Home page hero

The home page (`/`) is a browse-first landing — anonymous users see a hero, then a paginated set list. Redesign just the hero to match the `/pricing` page's tone (radial-gradient ambient bg, large balanced title with gradient text accent, refined badge pill, generous spacing).
>
**Current hero:**
- Linear-gradient bg
- Title "I Want My MTG!" with 3-color gradient text clip
- Tagline: "Your Magic: The Gathering collection tracker — know what you own, what it's worth, and what you've spent."
- Three inline icon callouts: "Track cards & sets you own", "Watch your portfolio value", "Log buys, sells & gains"
- Mana color bar (5 colored pills) below hero, before set list
>
**Goals:**
- Match pricing-hero ambient depth (radial gradients) and typography (balanced title, tight letter-spacing, big size)
- Keep the three feature callouts but treat them more like the pricing-hero badge or pricing-card features
- One primary CTA (Start tracking / Sign up free) and one secondary (Browse sets, scrolls down)
- Decide whether the mana color bar stays
>
Produce: HTML+inline-style design for desktop and mobile.

## Prompt 4 — Authenticated app surfaces (portfolio + inventory)

The app has data-heavy authenticated pages (`/portfolio`, `/inventory`, `/transactions`) that need to absorb the `/pricing` page's visual language without becoming marketing-shaped. Redesign **page header + immediate-content surfaces** for `/portfolio` and `/inventory` only — don't touch the rest of the page yet.
>
**Current:** small gradient-clipped page title, then directly into content. Stat cards use white/midnight-800 surfaces, rounded-lg, gray borders.
>
**Goals:**
- Refined page header: subtitle / breadcrumb / action row
- Stat tiles upgraded to richer surfaces (deeper dark bg, larger radius, optional gradient wash for primary metric)
- Match pricing typography rhythm and color depth
- Stay utility-shaped, not marketing-shaped
>
Specific data to design around:
- `/portfolio`: one big "Current Value" stat, then a row of secondary stats (Total Invested, Cards/Units, with Unrealized P&L / Realized Gains / ROI as locked premium tiles for free users), then a refresh button
- `/inventory`: filter/sort controls, then a list/binder toggle, then results
>
Produce: HTML+inline-style designs for both pages at desktop and mobile, free-tier and premium states for `/portfolio`.

## Prompt 5 — Button system reconciliation

Reconcile two button systems into one cohesive language. Both currently exist:
>
**In-app buttons (`.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`):** solid teal/purple/hotpink, rounded-lg, glow shadow on hover.
>
**Pricing-page buttons (`.pricing-btn-cta`, `.pricing-btn-ghost`):** teal→blue gradient with dark text, soft outer glow; or transparent + gray border.
>
**Goal:** propose a unified button system that:
- Has a clear "marketing CTA" treatment (sign up, upgrade, checkout) — likely matches the pricing CTA
- Has a clear "in-app primary action" treatment (save, submit, search) — slightly less heavy
- Has secondary, tertiary, ghost, and danger variants
- Works at multiple sizes (sm/md/lg) and full-width
>
Produce: a button system design page showing all variants, sizes, and states (default, hover, active, disabled, loading) at desktop. Provide the CSS.

## How to apply

1. Run prompts 1 and 2 first (chrome — biggest visual change, single PR)
2. Run prompt 5 (button system) — feeds into everything else
3. Run prompts 3 and 4 (page-level hero / surface treatments)
4. After each batch, I implement the corresponding bullet on §2.14

---

# Per-page audit (§2.14)

Read this in conjunction with the chrome/foundations audit above. This section covers the per-page bullet ("Audit every existing page for visual reconciliation"). Each entry covers four axes: hero/header, card surfaces, tables, buttons.

## Tier 1 — high-traffic app pages

**set.hbs**
- Header: `.app-page-header` utility hero (radial-gradient bg, centered `.app-page-title` font-display, keyrune icon + tags). Adopted post-#472.
- Surfaces: `.stat-card` and `.section-container` at foundations defaults (`rounded-xl`, midnight-900). `.stat-card-highlight` uses a left-border accent rather than the gradient-wash pattern from `.pricing-card.featured`.
- Tables: cards table uses `.table-container` + `.table-header-row` (post-tables PR). Plus `.price-tile` (border-teal/purple, rounded-md) for set-price tiers.
- Buttons: `.btn-primary` / `.btn-secondary` / `.btn-ghost`. No marketing CTA.

**card.hbs**
- Header: `.card-info` outer surface (rounded-2xl, `.card-info-bg` radial gradient — purple top / teal bottom-right) wrapping image + play info + pricing as a single elevated block. The card image is the visual anchor; no separate hero header on top by design. Adopted post-#476.
- Surfaces: `.card-image-wrapper` inside `.card-info`, `.section-container` info panels, `.price-tile` for prices.
- Tables: "Other Printings" uses `.table-container` + `.table-header-row` (post-tables PR).
- Buttons: `.btn-primary` for in-app actions (sync inventory, etc.); CTAs unified post-#477.

**search.hbs**
- Header: small `.page-title`, no bg.
- Surfaces: result grid is `rounded-lg`, midnight-800, gray border. Uniform — no featured state.
- Tables: none.
- Buttons: `.btn-primary` for submit, ghost secondaries. Simple and consistent.

**setListPage.hbs**
- Defers to `partials/setList.hbs` — no page-level chrome to audit here.

**transactions.hbs**
- Header: centered header in `bg-teal-50 dark:bg-midnight-900` with `.page-title` + `.page-subtitle`. Minimal.
- Surfaces: none — page is dominated by a table.
- Tables: `.table-container` / `.table-row` / `.table-cell`. Header row has no hierarchy (no uppercase, no accent), hover is subtle. Major gap vs. `.pricing-table` styling.
- Buttons: `.btn-secondary` for Portfolio / Export, inline icon buttons for edit/delete.

**spoilers.hbs**
- Header: centered `.font-display text-2xl` with subtitle. Minimal.
- Surfaces: grid of set cards, `rounded-lg`, midnight-800.
- Tables: none.
- Buttons: none at page level.

**priceAlerts.hbs / notifications.hbs**
- Header: centered `.page-title` + subtitle. Minimal.
- Surfaces: rendered via AJAX (placeholder spinner in source).
- Tables: rendered via AJAX (not visible at SSR).
- Buttons: `.btn-primary` / `.btn-secondary`. Standard.

## Tier 2 — auth + account

**login.hbs / forgotPassword.hbs / resetPassword.hbs / resetRequestSent.hbs / resetPasswordResult.hbs / verificationResult.hbs / verificationSent.hbs**
- Header: `.page-title` (small) + optional `.page-subtitle` inside `.login-container` / `.verification-container`.
- Surfaces: shared pattern — `bg-white dark:bg-midnight-800`, `rounded-lg`, `border-t-4` accent stripe (purple-500 on most, teal on createUser). Distinctive but not pricing-shaped.
- Tables: none.
- Buttons: `.btn-primary` on submits. Ghost links for secondary nav.

**createUser.hbs**
- Same `.create-user-container` shape, `border-t-4 border-teal-400`, max-w-3xl.
- Already uses `.btn-cta` (gradient) on submit — ahead of the curve.

**user.hbs**
- Header: `.page-title` then per-section `.page-subtitle`. Minimal.
- Surfaces: stack of `.section-container` cards. Last section uses `border-l-4 border-hotpink-500` for the danger zone (left-stripe pattern, not gradient).
- Tables: none.
- Buttons: full mix — `.btn-primary`, `.btn-secondary`, `.btn-upgrade` (amber gradient), `.btn-danger` (hotpink). Most inconsistent button surface on the site.

**billing.hbs**
- Header: `.page-title` then conditional sections.
- Surfaces: standard `.section-container`. No special treatment for active subscription state.
- Tables: none.
- Buttons: `.btn-primary`, `.btn-secondary`, `.btn-upgrade`. Good upgrade button placement.

**billingSuccess.hbs**
- Header: large centered section, gradient bg `from-amber-50 via-teal-50 to-purple-50`, icon badge with glow. Most hero-shaped Tier 2 page — closest in spirit to the pricing tone.
- Surfaces: three feature link cards, teal borders, soft hover glow. Simple, effective.
- Tables: none.
- Buttons: `.btn-cta` (gradient) + `.btn-secondary`. Correct CTA usage.

## Tier 3 — informational

**gettingStarted.hbs**
- Header: centered header in `bg-teal-50 dark:bg-midnight-900`, `.page-title`. Minimal.
- Surfaces: long-form text + accent boxes (`bg-gray-50` / `bg-midnight-800`, `rounded-lg`, gray borders). Numbered teal step badges.
- Tables: none.
- Buttons: `.text-link` only.

**importExportGuide.hbs**
- Header: centered `bg-teal-50` header.
- Surfaces: text plus tables.
- Tables: `.table-container` / `.table-header` / `.table-row` — plain, no hierarchy. Same gap as transactions.
- Buttons: none.

**privacy.hbs / terms.hbs**
- Header: centered `bg-teal-50` header with date subtitle.
- Surfaces: none — long-form text.
- Tables: none.
- Buttons: inline `.text-link`.

**offline.hbs**
- Header: centered icon + `text-2xl` heading.
- Surfaces: none.
- Tables: none.
- Buttons: one inline-Tailwind `bg-teal-500` button — should adopt `.btn-primary`.

**importResult.hbs**
- Header: centered `bg-teal-50` header.
- Surfaces: none.
- Tables: `.table-container` for error rows. Plain.
- Buttons: `.btn-primary` + `.btn-secondary`.

**portfolioBreakdown.hbs**
- Header: flex header with `.page-title` + `.page-subtitle` + back link. Larger and more balanced than most utility pages, but no hero bg.
- Surfaces: free-tier upsell uses `.section-container` centered. Tabs are `inline-flex rounded-lg border bg-gray-50` (no active-state styling visible). Breakdown rows are custom `.breakdown-row` etc.
- Tables: custom list, not a table.
- Buttons: `.pricing-btn .pricing-btn-cta` for premium upsell (correct), `.btn-secondary` for nav.

**sealed-product-detail.hbs**
- Header: inline title (`.card-title`), no hero.
- Surfaces: `.section-container` + `.subsection-container` + `.price-tile`. Same shape as card.hbs.
- Tables: none.
- Buttons: `.btn-ghost` back link, inline upsell elements.

**inventoryBinder.hbs**
- Header: `.section-container` flex header (title + back). Subtitle link to set view.
- Surfaces: 3-col `.stat-card` grid above a `.binder-grid` of card images.
- Tables: none.
- Buttons: `.btn-ghost` for back, custom toggle for "Owned only".

**errors/401.hbs / 404.hbs / 500.hbs**
- Header: large centered code (`font-display text-8xl`, teal/hotpink), heading, description.
- Surfaces: none — centered flex.
- Tables: none.
- Buttons: `.btn-primary` + `.btn-secondary`.

## Cross-cutting findings

1. **Tables are the biggest gap.** `.pricing-table` has uppercase headers, teal accent on the premium column, subtle row hover, category rows. App tables (`transactions.hbs`, `importExportGuide.hbs`, `importResult.hbs`) use plain `.table-header` / `.table-row` / `.table-cell` with no hierarchy. Universal across every page that uses a table.
2. **Surface radius is uniform at `rounded-lg`.** Pricing uses `rounded-2xl`. No variance anywhere on the site — every panel, stat card, container is the same radius. Bumping to `rounded-xl` (12px) site-wide would give a meaningful softness lift without breaking dense data views.
3. **Dark-mode bg sits at `midnight-800`; pricing sits at `midnight-900`.** Pricing feels deeper and richer. Subtle but consistent mismatch.
4. **CTA button language is fragmented.** `.btn-primary` (solid teal), `.btn-cta` (gradient teal — used only in createUser, billingSuccess, portfolioBreakdown), `.btn-upgrade` (amber gradient — user, billing), plus inline-Tailwind gradient on the card-detail sync button and offline.hbs retry button. Three CTAs are doing the job of one.
5. **Form/auth pages converge on a `border-t-4` accent stripe pattern.** Login, createUser, verification all share it — cohesive within Tier 2, but disconnected from the pricing/home gradient-wash language.
6. **Hero treatments are binary.** Either marketing-grade (home, pricing, billingSuccess) or absent (everything else). No "utility hero" middle ground for app pages — portfolio.hbs and inventory.hbs are the closest after #472.
7. **Title typography compresses everywhere.** `.page-title` clamps to 1.25-1.5rem; pricing hero clamps to 2.2-3.5rem. No size progression by page type.
8. **No featured-surface pattern on app pages.** `.stat-card-highlight` uses a left-border accent rather than the gradient-wash + soft glow from `.pricing-card.featured`. Locked premium tiles, billing-success cards, "Most Popular" cards all under-treated.
9. **Empty-state and accent-box styling is consistent** (teal-50 bg, soft borders) — fine to keep.
10. **Several spots use raw inline Tailwind for gradients** (card-detail sync button, offline retry, billingSuccess feature cards). These should adopt named classes once the CTA system is unified.

## Recommended next implementation order

1. **Unify CTAs into a two-tier system: `.btn-cta` (gradient, marketing/conversion) and `.btn-primary` (solid teal, in-app actions).** Retire `.btn-upgrade` (fold into `.btn-cta`). Replace inline-Tailwind gradients. Highest visual coherence return — every button on the site touches this.
2. **Standardize tables.** Adopt `.pricing-table`'s header treatment (uppercase, border-b, teal accent column), row hover, and category-row styling on `.table-container`. Hits transactions, importExportGuide, importResult immediately and any future tables.
3. **Bump surface radius to `rounded-xl` and dark-mode bg to `midnight-900` site-wide.** One-shot Tailwind/CSS change that lifts every page without per-page work. Cheap.
4. **Define a "utility hero" pattern** (subtle radial bg, larger clamp on `.page-title`, optional badge row) and roll out to set, card, search, transactions, spoilers. Closes the binary gap between marketing-shaped and absent.
5. **Promote `.pricing-card.featured` treatment to a reusable `.surface-featured` class.** Apply to locked premium tiles (upgradeTile.hbs), billingSuccess feature cards, "Most Popular" pricing card, future flagship stat tiles.

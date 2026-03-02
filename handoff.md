# Handoff: Set Price Info Fixes

## Changes Made

### 1. Weekly Price Change Amounts on Set Price Tiles

**Problem:** The set price info popover showed the price for each tier (Base Set, Base + Foils, All Cards, All + Foils) but was missing the weekly change amounts (+/- amounts) that the card page price tiles correctly display.

**Root Cause:** The data was already being passed from the backend (`SetOrchestrator.createSetPriceDto()` correctly computes all 8 change fields) and was available as Handlebars variables, but the `set.hbs` template never rendered them inside the price tiles.

**Fix:** Added `<span class="price-change ...">` elements to each of the 4 price tiles in `src/http/views/set.hbs`, matching the same pattern used in `card.hbs`:
- `set.prices.basePriceNormalChangeWeekly` / `basePriceNormalChangeWeeklySign` for Base Set tile
- `set.prices.basePriceAllChangeWeekly` / `basePriceAllChangeWeeklySign` for Base + Foils tile
- `set.prices.totalPriceNormalChangeWeekly` / `totalPriceNormalChangeWeeklySign` for All Cards tile
- `set.prices.totalPriceAllChangeWeekly` / `totalPriceAllChangeWeeklySign` for All + Foils tile

**Files Changed:**
- `src/http/views/set.hbs` — Added price change spans to each of the 4 price tiles (lines ~118-172)

---

### 2. Chart Tooltip X Close Button

**Problem:** When clicking a data point on the price history chart (both card and set charts), a tooltip appears and "pins" in place. There was no X button to dismiss it — users had to click elsewhere or click the same point again to close it.

**Root Cause:** Both charts used Chart.js's built-in canvas-rendered tooltip, which doesn't support interactive HTML elements like close buttons.

**Fix:** Replaced the native canvas tooltip with a custom external HTML tooltip (`enabled: false, external: externalTooltipHandler`) in both chart files. The custom tooltip:
- Renders as an absolutely-positioned `<div>` with class `chart-tooltip` inside the canvas container
- Shows an X close button (class `chart-tooltip-close`) only when the tooltip is pinned
- Uses the same content/formatting as the original canvas tooltip (label text, colors, swatches)
- Preserves all existing behavior: hover to preview, click to pin, click same point to unpin, click outside to dismiss

**Files Changed:**
- `src/http/public/js/priceHistoryChart.js` — Added `getOrCreateTooltipEl()`, `externalTooltipHandler()`, close button wiring, updated tooltip config and outside-click handler
- `src/http/public/js/setPriceHistoryChart.js` — Same changes as card chart
- `src/http/public/css/app.css` — Added CSS for `.chart-tooltip`, `.chart-tooltip-close`, `.chart-tooltip-title`, `.chart-tooltip-body-item`, `.chart-tooltip-swatch`
- `src/http/views/set.hbs` — Added `position: relative` to the chart canvas container div (card.hbs already had it)

---

## Architecture Notes

### Tooltip Flow
1. Chart.js calls `externalTooltipHandler(context)` instead of rendering its own canvas tooltip
2. The handler creates/reuses an HTML `<div>` positioned over the chart
3. When `pinnedTooltip` is set, the tooltip gets the `pinned` class which makes the X button visible and enables pointer events
4. The X button click handler clears `pinnedTooltip`, hides the tooltip, and resets chart active elements

### Data Flow for Weekly Changes (Set Prices)
```
Database (set_price table: base_price_change_weekly, etc.)
  → SetPrice entity (basePriceChangeWeekly, etc.)
  → SetOrchestrator.createSetPriceDto() → formatChange()
  → SetPriceDto (basePriceNormalChangeWeekly + basePriceNormalChangeWeeklySign, etc.)
  → set.hbs template renders in price tiles AND as data-* attributes on chart container
  → setPriceHistoryChart.js reads data-* attributes for chart tooltip enhancement
```

## Testing

- All 481 unit tests pass (`npm test`)
- Changes are purely frontend (views, JS, CSS) — no backend logic changed
- Manual testing recommended: visit a set page, open price info popover, verify weekly changes appear on tiles, click chart points to verify tooltip X button works

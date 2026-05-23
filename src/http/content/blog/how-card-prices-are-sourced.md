---
title: How card prices show up on the site
date: 2026-05-22
description: Where the prices come from, how often they update, and how long we keep the history behind your charts.
---

A common question from new users: where do the prices come from, and how
fresh are they? The short version is that prices update daily, sourced
from MTGJSON, processed by our own tool, and stored in a way that keeps
recent history detailed and older history compact.

The slightly longer version is below.

## Where the numbers come from

Prices originate with MTGJSON, which aggregates pricing from major
marketplaces. We pull the daily snapshot. Each card has up to two
prices: normal and foil. Sealed products have their own prices.

We do not invent prices, smooth them, or apply any kind of average. The
number you see on a card page is the most recent daily price we received
for that card from that source. If the source shows a gap (a card with
no recent sales, for example), the price will be null and the card will
show as unpriced until the next snapshot fills it in.

## Scry, the tool that does the work

The actual fetching and database loading is done by a separate tool we
built called Scry. It is a small Rust command-line program. Once a day,
a cron job on the server runs Scry's ingest command, which pulls the
day's MTGJSON snapshot, parses out the cards, sets, prices, and
legality data, and writes everything into the database.

A second cron then runs post-ingest updates, which is where set price
tiers get recalculated and the daily price history snapshot gets
written.

You do not see Scry in the app. You see its output: today's prices on
every card page, your portfolio value reflecting today's market, and
the price chart on a card's detail page that lets you see how a price
has moved over time.

## What "today's price" actually means

Because the ingest runs once a day, every price you see is a daily
close, not a live ticker. A card that moved 20 percent today will not
show that move until tomorrow's snapshot arrives.

This is on purpose. Card prices are noisy at the minute-to-minute level
and most of that noise is not signal you can trade on. A daily snapshot
gives you a clear, comparable number for every card and avoids the
problem of two pages on the site disagreeing about a card's price
because they were rendered eight seconds apart.

## The price history retention policy

Every daily price snapshot adds rows to a price history table. Without
some kind of pruning, that table grows forever and the charts start
loading slowly. So we apply a tiered retention policy:

- **The last 7 days:** every day is kept.
- **8 to 28 days ago:** only Monday snapshots are kept.
- **Older than 28 days:** only the first-of-the-month snapshot is kept.

This keeps recent history detailed enough to see week-over-week moves,
and long-term history compact enough to load instantly. A six-month
chart shows you the shape of the move without the daily noise; a
two-week chart shows you every day.

If you ever wonder why an old chart looks coarser than a recent one, this
is why. We are not hiding data, we are just trading day-level resolution
for chart performance once the data gets old enough that you would not
look at it day-by-day anyway.

## Set prices have history too

Sets get the same treatment. A set has a few price tiers (base price for
the main set, total price including variants, and both again for the
foil versions). Each of those is snapshotted daily, with the same
retention policy applied. That is what powers the set value chart on
each set's page.

## When you might see stale prices

A handful of cases:

- **Recent spoilers.** MTGJSON sometimes lists a card before any
  marketplace has it for sale. No marketplace listings, no price.
- **The cron job missed a day.** Rare, but possible. The next day's run
  catches up automatically, so you might see no change for a day and
  then two days' worth of movement the day after.
- **Foil versions of low-value cards.** Foils tend to have thinner
  marketplace data. Sometimes the foil price is null even when the
  non-foil has updated.

In all of these cases the number is what we have, not what we have
guessed. If it looks wrong, it is probably right and the market just
has not caught up to your intuition yet.

## Source code

Scry is open source. If you want to see exactly how the pipeline works,
the GitHub repository is linked in the footer alongside this site's.
The web app and the ETL tool are separate repos because they serve
different purposes: the web app is a website, the ETL tool is a
batch job.

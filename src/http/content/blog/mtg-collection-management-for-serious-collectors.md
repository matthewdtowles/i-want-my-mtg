---
title: MTG collection management for serious collectors
date: 2026-05-24
description: What "serious" actually means here, where the popular tools fall short for collectors who treat their cardboard as an asset, and what to look for instead.
---

Most Magic collection apps are built for the player who wants to know if
they own four copies of a card before brewing a deck. That is a fine
problem to solve, and the popular tools solve it well. But it is not the
same problem a serious collector has.

This post is about the second problem: what changes when your collection
is large enough, valuable enough, or held long enough that you start
thinking about it as an asset rather than a stash of cardboard.

## What "serious" means here

Not a precise threshold, but roughly:

- **More than 1,000 cards**, or more than a few thousand dollars in
  value. Below that, a spreadsheet still works and the marginal benefit
  of a serious tool is small.
- **You care about value over time**, not just current value. You want
  to know what the collection was worth a year ago, which cards drove
  the change, and how your portfolio is trending.
- **You have a sell side.** You have sold cards before, you will sell
  cards again, and you want to know whether you made money doing it.
- **You think in dollars, not in playsets.** A card going from $8 to $40
  matters to you for reasons other than whether your deck got more
  expensive to assemble.

If three of those four describe you, the rest of this post will be
useful. If none of them do, you probably do not need a "serious" tool
and a free one will do.

## Where the popular tools stop short

Most apps in this space were built deck-first. Inventory is a side
feature, often added later. The result is good deck tooling and thin
collection tooling. A non-exhaustive list of common gaps:

**No real cost basis.** Most tools track what you own and what it is
worth. Few track what you paid. Without cost basis, "your collection is
worth X" is a one-sided number. You do not know if it has made or lost
money.

**No profit and loss on sells.** When you sell a card, where does that
go? In most apps, it just disappears from inventory. The realized gain
or loss never gets calculated, so you cannot answer "did I make money
last year" without external bookkeeping.

**Inventory history that resets.** A few apps snapshot inventory daily.
Most do not. If yours does not, you cannot look back at what you owned
in January, only at what you own now. This matters if you are trying to
understand how your collection has changed.

**No portfolio chart.** The single most useful view for a long-term
collector is a chart of total value over time. It is also the view most
apps do not have, because it requires keeping daily snapshots of both
inventory and prices.

**No breakdown beyond "rare vs uncommon."** Serious collectors think in
sets, formats, archetypes, and acquisition sources. "How much of my
collection is Modern-legal?" and "what's my collection's value by set?"
are questions a deck-builder does not ask but a collector does.

**Sealed tracked as an afterthought, if at all.** Sealed product is its
own asset class. Boxes, collector boosters, draft boosters, bundles, and
secret lairs all behave differently from singles. Most tools either
ignore sealed or treat it as one more card.

## What to look for instead

A serious collection tool needs five things. These are the questions to
ask any app you are evaluating:

1. **Does it track cost basis automatically?** Not just "you can add a
   purchase price field." Does it sum buys, apply FIFO to sells, and
   surface a real cost-basis number on the portfolio view?
2. **Does it calculate realized and unrealized profit and loss?** You
   should be able to see what you have gained on cards you have sold,
   separately from what you have gained on paper on cards you still own.
3. **Does it keep portfolio history?** Can you look at a chart of your
   total value over six months or a year? If no, you are flying blind on
   the question that matters most.
4. **Does it break down by dimension?** Can you slice your collection by
   set, by rarity, by format legality, by cost basis tier? These are the
   views that turn raw numbers into decisions.
5. **Does it handle sealed?** Tracked as a separate inventory type with
   its own pricing, not crammed into the cards table?

If a tool does three of these well, it is serious enough for most
purposes. If it does all five, you are looking at the right kind of
product.

## What we built

This is our space. We built [I Want My MTG](/) for the serious case
specifically, because the popular tools were not solving it for us.

What ships:

- **Cost basis and FIFO accounting** on every buy and sell. Documented
  in our [post on portfolio numbers](/blog/understanding-your-portfolio).
- **Realized and unrealized P&L** on the Portfolio page, separately
  computed and displayed.
- **Portfolio value chart** with daily snapshots, going back as far as
  your account does.
- **Breakdown views** at [`/portfolio/breakdown`](/portfolio/breakdown)
  by set, rarity, type, format, and cost basis tier. Color breakdown is
  on the roadmap.
- **Sealed product tracking** with its own inventory and value lines,
  separate from singles.
- **Price alerts** with multi-threshold support (upside and downside on
  the same card), unlimited on the premium tier.
- **CSV import** from Moxfield, Archidekt, Deckbox, TCGPlayer, and our
  own format. Onboarding from another tool takes one upload.
- **A real API** at [`/developer`](/developer), plus an MCP server for
  Claude users. If you want to script against your collection, you can.

We are pricing this honestly: free tier is fully usable forever (no card
caps, no inventory caps), and premium ($3.99/mo or $39.99/yr) unlocks
the analytics features above that benefit from the daily snapshots and
deeper history. Imports moved to the free tier in April 2026 because
gating acquisition behind a paywall was the wrong call.

The roadmap and what we have shipped are on [GitHub](https://github.com/matthewdtowles/i-want-my-mtg).
This is an open product and we say what is next in public.

## The honest comparison

We are not the right tool for every collector. If you primarily build
decks and care about collection as a side effect, Moxfield or Archidekt
are better fits and they are very good at what they do.

If you are mostly a casual collector and you want a free, simple
inventory tracker, Deckbox has been doing that well for over a decade.

If you treat your collection as an asset, want real financial analysis,
and care about how value moves over time, we built this for you. Give
it 15 minutes with a CSV import and see whether the portfolio view tells
you something you did not know.

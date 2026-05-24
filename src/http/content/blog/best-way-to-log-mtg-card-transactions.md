---
title: The best way to log MTG card transactions
date: 2026-05-24
description: Why transaction history matters more than inventory, what to capture per buy and sell, and how to keep the habit without losing weekends to data entry.
---

Most collectors track inventory. Far fewer track transactions, and the
ones who do not usually regret it the first time they try to answer a
simple question: did I make money on Magic cards last year?

Inventory tells you what you own. Transactions tell you how you got
there and what it cost. Without the second one, you can guess at your
profits but you cannot prove them. This post is about how to log
transactions without it becoming a second job.

## What a transaction log gives you that inventory does not

Three things, in order of importance:

1. **Real profit and loss.** When you sell a card, you know exactly what
   it cost you to buy and exactly what you got for it. No estimation.
2. **Cost basis.** The total amount you have actually put into the
   collection, separate from what it is worth now. Useful for budgeting,
   useful at tax time if you sell at any scale, useful for arguments
   with your spouse.
3. **History.** A record of every buy and sell across years, searchable
   by card, by date, by source. You will be surprised how often you want
   this and how rarely a spreadsheet has it.

Without transactions, "this collection is worth $4,000" is a number with
no context. With transactions, you also know you spent $3,200 to get
there, so $800 of that is gain. Or you spent $5,000, so $1,000 of it is
a loss you have not realized yet. Both are useful. Neither is available
from inventory alone.

## What to capture per transaction

Five fields, every time:

- **Date.** When the buy or sell happened. Not when you logged it.
- **Card and quantity.** Which card, how many copies, normal or foil.
- **Price per copy.** What you paid (for a buy) or received (for a sell)
  per card, before any shipping or fees split across the order.
- **Fees and shipping.** Combined into a per-line adjustment, or logged
  as a separate fee row. Either is fine as long as you are consistent.
- **Source.** TCGPlayer, Card Kingdom, eBay, your LGS, a friend. You
  will care about this less often than you think, but when you do care,
  not having it is annoying.

You do not need notes. You do not need condition (it is implied by what
you bought). You do not need a category. Keep the schema small and the
habit survives.

## The two ways people do this badly

**Logging in real time, then giving up.** The first week is great. Every
purchase gets logged the night it arrives. By week three, half the
purchases are unlogged and you decide "I will catch up this weekend."
You do not catch up. Six months later you have a partial log that is
worse than no log because you do not remember which transactions are
missing.

**Bulk-importing inventory but not transactions.** You upload a CSV from
Moxfield and now the app knows you own 800 cards. It does not know what
they cost you. Cost basis is zero, every card looks like pure profit,
and the numbers are wrong in a way that takes weeks to fix.

The fix for both is the same: pick a logging rhythm you can actually
keep, and use bulk import for purchase history, not just inventory.

## A logging rhythm that survives

The cheapest habit that works:

1. **Once a week**, go through your email and pull out every Magic
   purchase receipt. Most online retailers send confirmation emails with
   the cards and prices broken out.
2. **Open the transactions page**, click "import CSV," and either upload
   the order confirmation (TCGPlayer's app export is the most common) or
   manually add the rows.
3. **Sells go in the same way**, ideally the same day you ship.

Twenty minutes a week is the realistic budget. If it costs you more than
that, your process is too detailed and you will quit.

The transactions page has a [CSV importer](/transactions) that handles
TCGPlayer's confirmation exports and our own format. If you bought 30
cards in one TCGPlayer order, that is one file upload, not 30 manual
rows.

## What to do if you have years of un-logged history

You probably will not log it. Be honest about this. Even if you have
every receipt, sitting down to enter five years of purchases is the kind
of project that lives on a todo list forever.

The pragmatic move is to draw a line:

- **From today forward**, log everything.
- **For high-value cards you already own**, add an approximate buy with
  the price you remember paying. Even a rough number gives the app
  something to compute cost basis against. It will be wrong by a few
  dollars per card. That is fine. It will not be wrong by hundreds.
- **For everything else** (the bulk and near-bulk), skip it. Your cost
  basis will be slightly underestimated, which means your reported
  profit will be slightly overestimated, which is the direction nobody
  minds being wrong in.

This is "good enough" history. Past a certain age, the difference between
"I paid $4" and "I paid $6" for a card is not going to change a decision.

## How the app uses your transactions

Once you have buys and sells logged, the Portfolio page calculates four
things automatically:

- **Cost basis.** Sum of every buy.
- **Realized gains.** Profit (or loss) from every sell, using FIFO to
  match sells to the right buys. We have a [longer explanation of FIFO
  and unrealized P&L on the blog](/blog/understanding-your-portfolio) if
  the mechanics matter to you.
- **Unrealized gains.** Current value of held cards minus their cost
  basis.
- **ROI.** Total return as a percentage, blending both.

The breakdown views go further: P&L by set, by rarity, by purchase
source. Premium features, but powered by the same data. If you have not
logged transactions, none of these tiles have anything to show.

## The honest summary

Transaction logging is not a feature you turn on once. It is a habit you
maintain. The collectors who get value out of it are the ones who built
the habit small and kept it. The ones who try to log everything
perfectly burn out in a month and have a half-finished log forever.

Pick the five fields above. Pick a weekly rhythm. Use the importer
whenever the data is already in a file somewhere. That is the whole
game.

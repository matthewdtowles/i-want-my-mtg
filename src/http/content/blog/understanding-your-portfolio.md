---
title: Understanding your portfolio numbers
date: 2026-05-22
description: A plain-English walk through cost basis, FIFO, unrealized vs realized gains, and what the Portfolio page is actually doing under the hood.
---

If you have ever opened the Portfolio page and wondered where the numbers
come from, this post is for you. We will walk through each line on the
page, in the order it shows up, and explain what it means and where the
math comes from.

## The two inputs

Everything on the Portfolio page is built from two things:

1. **Your inventory.** What you currently own, in what quantity, foil or
   non-foil.
2. **Your transactions.** A log of every buy and sell you have recorded,
   including the price you paid or received.

Inventory tells us what you own right now. Transactions tell us what it
cost to get there. You can use the app with only inventory and skip
transactions entirely, but then we cannot calculate cost basis or
profit and loss for you. The Portfolio page leans on both.

## Current value

The easiest number. We take every card and sealed product in your
inventory, multiply each by its current market price, and add them up.
Foil and non-foil are valued separately. If a card has no price (a recent
spoiler, for example), it contributes zero.

This is the number you see in the headline. It moves every day as prices
update.

## Total invested (cost basis)

This is the sum of every buy transaction you have ever recorded, with one
twist: when you sell a card, we have to decide which copy you sold.

We use **FIFO**, short for first-in, first-out. The oldest copy you
bought is the first one we count as sold. Say you bought one copy of a
card for $5 in January and another for $20 in March. If you sell one
copy in May, FIFO says you sold the January copy. Your remaining cost
basis for that card is $20, not $12.50 (the average) and not $5 (the
most recent).

FIFO is the standard method most accountants reach for, and it tends to
match how collectors actually think about their cards. The oldest copy is
the one you have lived with the longest, so it is the one most likely to
leave the shelf first.

## Unrealized P&L

This is the gain or loss on cards you still own.

> Unrealized P&L = Current value of held cards - Cost basis of held cards

"Held" is the key word. Sold cards do not show up here. If a card has
doubled in price but you have not sold it, the gain is unrealized: real
on paper, not yet in your pocket.

## Realized gains

The flip side. When you record a sell transaction, we subtract the FIFO
cost basis of the copies you sold from the price you received. That
difference is your realized gain (or loss) for that sale. The Portfolio
page sums them across every sell you have logged.

Realized gains are locked in. They do not move when prices move, because
the sale already happened.

## ROI

Return on investment, as a percentage:

> ROI = (Current value + Realized gains - Total invested) / Total invested

A positive ROI means your collection (sold and held combined) is worth
more than you spent on it. A negative ROI means the opposite. It is a
single number that bakes in both unrealized and realized performance.

## Why your numbers might look off

A few things trip people up:

- **You logged sells without buys.** FIFO needs a buy to draw from. If
  you sell a card you never recorded buying, the cost basis is zero and
  the gain looks artificially large.
- **You imported inventory but not history.** A bulk inventory import
  gives us the "what you own" picture but no purchase history. Cost
  basis and P&L will only reflect transactions you logged after the
  import.
- **A card has no current price.** Recent spoilers, obscure printings,
  and some promos have gaps in price data. They count as zero in current
  value until a price shows up.

You do not have to record every transaction to use the app. But the
more complete your transaction log is, the more useful the Portfolio
page becomes.

## Where to go from here

If you have inventory but no transactions, the fastest path to a real
Portfolio number is to log buys for your most valuable cards first. Even
rough purchase prices give you a baseline. You can refine later.

If you have questions about a specific number on your own Portfolio
page, the Discord linked in the footer is the place to ask.

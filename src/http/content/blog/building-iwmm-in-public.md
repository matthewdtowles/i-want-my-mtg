---
title: Building I Want My MTG in public - what worked and what hurt
date: 2026-05-24
description: An honest look at the architecture and product decisions behind the app - the NestJS layered structure, a Rust ETL in a separate repo, API-first design, and where the choices paid off versus where they cost us.
---

This is a slightly different kind of post: less about Magic, more about
how this app was built. The intended reader is anyone considering
similar architectural decisions on a side project, anyone curious about
the engineering tradeoffs behind the product, or anyone who just likes
post-mortems written before the project is finished.

Everything below is on [GitHub](https://github.com/matthewdtowles/i-want-my-mtg)
and is open source. Code references in this post are real files in that
repo; you can click through to verify any claim.

## The stack at a glance

- **Web app:** NestJS, TypeScript, server-rendered Handlebars views,
  Tailwind CSS, vanilla JavaScript on the client (no framework).
- **Database:** PostgreSQL 18, managed via AWS Lightsail. TypeORM with
  `synchronize: false`. All schema changes go through migration files.
- **ETL:** A separate Rust CLI called Scry (also open source), in its
  own repo, that pulls daily snapshots from MTGJSON and writes them to
  Postgres. Run from cron on the production server, not as a container.
- **API:** Versioned REST at `/api/v1/*`, JWT and API key auth,
  OpenAPI spec served live, Redoc UI at `/developer/docs`, listed on
  RapidAPI.
- **MCP server:** Separate npm package that talks to the API via a typed
  client generated from the OpenAPI spec.
- **Deploy:** GitHub Actions to ghcr.io, SSH deploy to Lightsail.
  Service worker with versioned caches for cache-busting on releases.

## What worked: the layered NestJS structure

The clearest architectural win has been the four-layer structure that
NestJS encourages and we leaned into hard:

```
Controllers       -> Route handlers, validation
    |
Orchestrators     -> View assembly, query parsing, error mapping
    |
Services          -> Business logic, domain operations
    |
Repository Ports  -> Interfaces (abstractions)
    |
Repositories      -> TypeORM implementations
```

The split that paid off most was services depending on **repository port
interfaces**, not on TypeORM directly. Every service in the codebase
takes a port like `CardRepositoryPort` in its constructor. The
implementation is bound in `DatabaseModule` via NestJS dependency
injection. In tests, we mock the port. In production, the port resolves
to a TypeORM-backed class.

The win: services have zero TypeORM knowledge. We can write integration
tests against real Postgres and unit tests against mocked ports without
maintaining two code paths.

The cost: more files. Every database entity has three pieces (ORM
entity, repository, mapper). For a small project, this is overkill. For
a project that ran to a few thousand cards then a few hundred thousand
cards then API consumers and an MCP server, the seams paid off every
time we needed to add a new consumer of an existing service.

## What worked: a separate orchestrator layer

The other split that paid off was inserting an **orchestrator layer**
between controllers and services. Orchestrators handle presentation
concerns: assembling view DTOs, parsing query parameters into a
`SafeQueryOptions` object, mapping domain exceptions to HTTP responses.

We put this in early without a strong rationale beyond "controllers
should be thin." A year later, when we built the API on top of the same
services, the value was obvious: API controllers are also thin, also
delegating to services, also reusing the same domain logic. The
orchestrator was where the HTML-specific concerns lived, and removing
the orchestrator from the API path was a single import change per
controller.

If we had let view assembly leak into services, the API would have
been a rewrite. Because we did not, it was a layer addition.

## What worked: API-first, with the UI as one consumer

The biggest unforced win was deciding that **every UI feature also gets
an API endpoint**. The web app's AJAX paginate/sort/filter logic, the
inventory page's quantity steppers, the transaction importer: all of
them call `/api/v1/*` like any external consumer.

This is one of those decisions that costs nothing extra at the time and
compounds over years. By the time we wanted to ship an API to external
users, the API was already battle-tested by being the production
backend for the website. There was no "now we build the public API"
phase. We just exposed what was already there, polished the OpenAPI
spec, and added rate limiting.

The same decision paid off again when we built the MCP server.
Generating a typed client from the OpenAPI spec took an afternoon. The
typed client immediately caught a bug we had been carrying for months
(a controller defined a `PUT` route, the client was sending `PATCH`).
If we had been hand-writing the MCP client against an undocumented API
surface, we would have shipped the bug.

## What worked: Scry in a separate repo

The ETL tool (Scry) started life inside this repo as a Node.js script
that grew into something large enough to warrant its own concerns. We
split it out into a separate Rust binary in 2025.

The arguments for splitting were entirely about lifecycle, not
performance:

- **Different deploy cadence.** The website ships daily during active
  development. The ETL stabilizes for weeks at a time.
- **Different dependency surface.** The website wants TypeScript and
  TypeORM. The ETL wants efficient JSON parsing, type safety on a long
  pipeline, and a small binary footprint.
- **Different failure modes.** A website bug should not break the daily
  price ingest. An ingest bug should not require redeploying the website.

What we did not anticipate: the separate-repo decision **coupled scry
updates to web deploys** in production. Cron runs the scry binary
directly (not via Docker), and the deploy pipeline pulls the latest
scry image during web deploys to extract the binary. If web has not
deployed since a scry release, the server runs the old scry. That is a
real ops gotcha and is documented in the project's CLAUDE.md.

## What hurt: Handlebars for everything

We ship server-rendered Handlebars views with progressive AJAX
enhancement, no SPA framework. This was deliberate (we wanted fast first
paint, real URLs, server-rendered SEO content, and no hydration
overhead) and we still believe in it for the kind of content this app
serves.

The cost is that **anything dynamic on the client side is hand-rolled**.
Quantity steppers, modal management, AJAX response handling, toast
notifications, table sort/filter state: all of it written in vanilla JS
in `src/http/public/js/`. Around 5,000 lines of frontend JavaScript
spread across small files, eventually with shared utilities in an
`AjaxUtils` module.

If we had picked React or Vue, we would have written less code, but we
would have paid for it with bundle size, hydration latency, and a
two-runtime mental model (server-renders the shell, client-renders the
interactivity). Side projects with one maintainer cannot afford
multiple runtimes well.

The honest summary: we chose right, but the choice was not free. The
people who tell you server-rendered apps are "simpler" are leaving out
the part where every interactive piece is yours to build.

## What hurt: Stripe configuration

Subscription billing was the single most painful piece to ship.
Stripe's API is genuinely good. Stripe's mental model is hard.

Specific friction:

- **Test mode and live mode have completely separate everything.** Test
  customers, test prices, test webhooks, test secrets. Promoting from
  test to live is a manual repointing of every config variable. We
  ended up with six env vars just for the Stripe price IDs (monthly,
  annual, API Developer, API Business, plus display amounts).
- **The webhook signature verification is the most fragile part.** Body
  parsing has to happen in a specific order. NestJS's default JSON
  parser destroys the raw body Stripe needs. We have a custom
  middleware just to preserve the raw body for the webhook endpoint.
- **Failure modes are not obvious.** A misconfigured webhook returns
  200 to Stripe (so it stops retrying) but logs no subscription update
  to the database. The user thinks they are subscribed, the database
  disagrees, and you find out a week later.

What we ended up with works (`SubscriptionGuard` decorator,
`@RequiresSubscription()` annotation, webhook handler that distinguishes
configuration errors from signature errors so Stripe retries
appropriately), but it took weeks of "why is the webhook returning 200
but the database is empty" debugging.

If we were starting today, we would still use Stripe. We would not
expect it to be easy.

## What hurt: progressive enhancement, the second pass

The first pass on AJAX paginate/sort/filter went badly. We added it
page by page, each page solving the problem its own way, with the
result that no two pages had the same response shape, no two pages
handled errors the same way, and shared logic existed only by
coincidence.

The fix was a **frontend consolidation pass** (the §1.6 work in the
roadmap): a shared `AjaxUtils` module with `renderTags`,
`stepperGroup`, and template cloning helpers; standardized
`emptyState.hbs` and `statCard.hbs` partials; consistent script-defer
ordering; consistent Normal-then-Foil column ordering. It took a few
weeks and the codebase is meaningfully smaller after, which is the
shape of a good refactor.

The lesson is the usual one: the first version of a cross-cutting
pattern is allowed to be ugly, but you must come back and refactor it
once you have enough examples to see what the pattern actually is.
Trying to design the abstraction up front almost never works because
you do not yet know what it needs to abstract.

## What we would do differently

Three things, off the top of my head:

1. **Start with the OpenAPI spec.** We did API-first, but the OpenAPI
   spec was bolted on partway through. If we had treated the spec as
   the source of truth from day one and generated DTOs from it, we
   would have avoided drift between the spec and the controllers we
   had to fix later.

2. **Integration tests against real Postgres, from day one.** We
   shipped unit tests early and integration tests late. The
   integration tests caught more bugs than the unit tests, by an
   order of magnitude. Should have been the default test type.

3. **Skip the "scry runs as a container in production" detour.** We
   spent time getting docker-compose ETL working in prod before
   deciding cron-running-the-binary-directly was the right answer.
   The detour cost us a few weeks.

## What's next

The roadmap is public at the top of the repo. The big items we are
working toward: a mobile app (Phase 6.1), card scanning by photo (6.3),
and a deeper analytics layer. The MCP server is the most recent ship
and is what made this post feel like a reasonable time to write.

If you build something similar, the architectural piece that mattered
most was: every piece of UI also exists as an API call, every service
depends on a port not an ORM, and the ETL is its own program with its
own deploy. The rest is details.

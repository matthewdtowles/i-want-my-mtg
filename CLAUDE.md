# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

I Want My MTG is a Magic: The Gathering collection tracker — a NestJS web app with server-rendered Handlebars views and PostgreSQL via TypeORM. The ETL tool ([Scry](https://github.com/matthewdtowles/scry)) lives in a separate repository.

## Development (Local)

```bash
docker compose up -d              # Start dev environment (web, postgres, adminer, mailhog)
docker compose build web          # Rebuild after code changes (add --no-cache if stale)
docker compose up -d web          # Restart web container after rebuild
docker compose exec web npm test  # Run tests in container
docker compose run --rm migrate   # Execute database migrations
./scripts/etl.sh ingest           # Run ETL (pulls scry image from ghcr.io)
```

After any code change, rebuild and restart:
```bash
docker compose build web && docker compose up -d web
```

**When `package.json` dependencies change**, the command above is not enough. The `web` service mounts `node_modules` as an anonymous volume (`- /app/node_modules` in `docker-compose.yml`), and `docker compose up` reuses that stale volume across recreations — so it keeps shadowing the freshly built image's `node_modules` and new deps appear missing (`TS2307: Cannot find module ...`). Recreate the container and discard the anonymous volume with `-V`:
```bash
docker compose up -d --build -V web
```
The `-V` (`--renew-anon-volumes`) flag repopulates `node_modules` from the rebuilt image. (`docker compose exec web npm install` followed by `docker compose restart web` also works, but `-V` is the one-step fix.)

### Testing

```bash
npm test                          # Run unit tests (Jest, maxWorkers=50%)
npm test -- --testPathPattern='card.service'  # Run a single test file
npm run test:cov                  # Tests with coverage
npm run test:frontend             # Frontend JS unit tests (jsdom)
npm run test:integ                # Integration tests with Docker lifecycle
npm run test:pw:full              # Playwright E2E tests (starts app + DB, runs tests)
npm run test:pw                   # Playwright tests (app must already be running)
npm run test:pw:ui                # Playwright interactive UI mode
npm run test:pw:headed            # Playwright headed mode
npm run lint                      # ESLint with --fix
npm run format                    # Prettier formatting
npm run format:check              # Check formatting without fixing
```

### Build Scripts

`build:prod` is the single build command used by Docker and CI. It runs all sub-steps in order: clean dist, build mana font, compile TypeScript, minify CSS, minify JS, inject service worker version. You should not need to run individual build scripts directly.

Other scripts for local development outside Docker:
```bash
npm run build:assets              # Rebuild CSS/JS/SW without recompiling TS
npm run build:css                 # Rebuild Tailwind CSS only (after style changes)
npm run start:dev                 # Watch mode (builds SW + nest watch)
```

## Production

CI/CD is handled by GitHub Actions (`.github/workflows/deploy.yml`). On push to main:
1. **test / integration-test / e2e-test** — Unit, integration, and Playwright E2E tests
2. **version** — Computes the release version from the squash-merged PR title (`.github/scripts/next-version.sh`)
3. **tag** — Creates a GitHub release/tag for the computed version
4. **build** — Builds Docker image using the `production` target (stamped with `APP_VERSION`) and pushes to `ghcr.io`
5. **deploy** — SSH deploy to Lightsail via `.github/scripts/deploy.sh`, then `verify-release.sh` asserts the live site serves the released version

The production Docker build (`target: production`) runs `npm run build:prod` which produces the final `dist/` directory with compiled TS, minified assets, and versioned service worker. The production stage copies only `dist/` and production dependencies.

### Service Worker & Cache Busting

The service worker (`src/http/public/sw.js`) uses a `__APP_VERSION__` placeholder that `build:sw` replaces with the version from `package.json`. When the version changes, the new SW activates and purges old caches. Versioning is automatic: CI computes the version from the squash-merged PR title (`feat:` → minor, `!` → major, anything else → patch — see `.github/scripts/next-version.sh`) and stamps it into the Docker image at build time. `package.json` stays at the `0.0.0-dev` placeholder; never bump it by hand.

### Scry ETL on the Production Server

Scry is **not** run as a container in production. During deploy, `.github/scripts/setup-cron.sh` pulls `ghcr.io/matthewdtowles/scry:latest`, `docker cp`s the `/app/scry` binary out to `/opt/scripts/scry`, and then deletes the image. The cron jobs in `cron/i-want-my-mtg` invoke that binary directly via `cron/scry.sh` — they do not go through `docker compose`.

Consequence: **scry updates are coupled to web deploys.** A new scry release published to `ghcr.io` does not reach the server on its own. The binary only refreshes when `remote-deploy.sh` runs `setup-cron.sh` again, which happens on every push to `main` in this repo. If web hasn't been deployed since a scry release, the server is running the old scry.

To refresh scry on the server without a full web deploy, SSH in and re-run the extraction steps from `setup-cron.sh`:

```bash
docker pull ghcr.io/matthewdtowles/scry:latest
cid=$(docker create ghcr.io/matthewdtowles/scry:latest)
sudo docker cp "$cid:/app/scry" /opt/scripts/scry
sudo chmod 755 /opt/scripts/scry
docker rm "$cid"
docker rmi ghcr.io/matthewdtowles/scry:latest
```

Note that `docker-compose.prod.yml`'s `etl` service exists but is gated behind `profiles: ['etl']` and is not what cron uses — it's only there for ad-hoc `docker compose run --rm etl ...` invocations, and `remote-deploy.sh` does not pull it (`docker compose pull web` only).

### Checking Scry ingest on the production server

The nightly ingest runs from cron, not `docker compose`. `/etc/cron.d/i-want-my-mtg` (installed from `cron/i-want-my-mtg`) runs `/opt/scripts/scry.sh` at **02:00 UTC daily**, appending to `/var/log/i-want-my-mtg/ingestion.log`. Sibling jobs: retention (Sun 03:00 UTC -> `retention.log`), published-deck ingest (daily 03:30 UTC, `ingest-decks --days 2` -> `decks.log`), price-alert processing (02:15 UTC -> `price-alerts.log`), portfolio-summary refresh (02:30 UTC -> `portfolio.log`), data-freshness check (06:00 UTC -> `health.log`), log cleanup (Sun 04:00 UTC -> `cleanup.log`). All times UTC; all jobs run as user `ubuntu`.

`MAILTO=legal@iwantmymtg.net` is set in the crontab and each job redirects **stdout only**. scry writes its report to stdout and failures to stderr, so cron mails you on failure and stays silent on success. Never add `2>&1` to those lines - that is what silenced two days of failed ingests.

`scry.sh` sources `/home/ubuntu/.env` (which sets `DATABASE_URL`) then runs `/opt/scripts/scry <args>` (default `ingest`). **Always go through the wrapper**, never the bare `/opt/scripts/scry`, or `DATABASE_URL` is unset and it fails.

```bash
ssh ubuntu@<LIGHTSAIL_IP>          # the Lightsail static IP, same key the deploy uses

# 1. Did last night's ingest run and finish? Each run opens with a
#    "<UTC ts> Starting scry.sh with args: ingest" line.
tail -n 100 /var/log/i-want-my-mtg/ingestion.log
grep "Starting scry.sh" /var/log/i-want-my-mtg/ingestion.log | tail -5    # recent run times

# 2. End-of-pass summary of what was written per table:
#    "... write totals (ms/calls): price=.../... price_history=.../... granular_price=.../..."
grep "write totals" /var/log/i-want-my-mtg/ingestion.log | tail -5

# 3. Data-integrity health check (through the wrapper so DATABASE_URL is set).
#    `health` alone exits non-zero if the newest price row is >1 day old.
/opt/scripts/scry.sh health
/opt/scripts/scry.sh health --detailed

# 4. Confirm cron is installed and the daemon is up:
cat /etc/cron.d/i-want-my-mtg
systemctl status cron
grep CRON /var/log/syslog | grep scry        # or: journalctl -u cron --since yesterday | grep scry

# 5. Confirm the binary is the build from the last web deploy:
ls -la /opt/scripts/scry                     # mtime should match the last deploy

# 6. Trigger a manual ingest if needed (same path cron uses, logs to stdout):
/opt/scripts/scry.sh ingest
```

Since §10.10 (the granular price-store cut), the `write totals` line no longer carries a `granular_price_history` field and `granular_price` calls collapse to just the CK-direct buylist writes - that is the signal the cut took effect on a nightly run.

### Deployment order (web + Scry)

Scry writes tables that **this repo's migrations create**, and **this repo's deploy installs the Scry binary** (`setup-cron.sh` extracts it from `scry:latest`, *after* `run_migrations.sh` runs - see above). So when a change spans both repos (e.g. Scry starts writing a new table):

1. **Publish Scry first** (`ghcr.io/matthewdtowles/scry:latest`). This is safe - it does not touch production; the server keeps running the old binary, which stays correct because Scry changes are additive.
2. **Deploy web second.** The deploy migrates (creates the table), then extracts the new binary - so the schema exists before the new binary runs, and both land in one deploy.

Web-first is safe but inert: it would extract the still-old binary, so the new behavior only starts after a second web deploy once Scry has published. The one real footgun is hand-refreshing the binary on the server (the `docker cp` steps above) before the migration has run - don't.

## Architecture

### Layered Structure (NestJS)

```
Controllers (src/http/*/controllers)    — Route handlers, request validation
    ↓
Orchestrators (src/http/*/orchestrators) — View assembly, query parsing, error mapping
    ↓
Services (src/core/*)                    — Business logic, domain operations
    ↓
Repository Ports (src/core/*/ports)      — Interfaces (abstractions)
    ↓
Repositories (src/database/*)            — TypeORM implementations
```

**Port-Adapter pattern**: Services depend on repository port interfaces (e.g., `CardRepositoryPort`) located in `ports/` subdirectories (e.g., `src/core/card/ports/card.repository.port.ts`). Concrete implementations are bound in `DatabaseModule` via NestJS DI:
```typescript
{ provide: CardRepositoryPort, useClass: CardRepository }
```

Each database entity has three pieces: ORM entity (`*orm-entity.ts`), repository (`*.repository.ts`), and mapper (`*.mapper.ts`) that converts between ORM entities and domain entities.

### Module Organization (NestJS)

`AppModule` imports three main modules:
- **`DatabaseModule`** (`src/database/`) — TypeORM entities and repository port bindings
- **`HttpModule`** (`src/http/`) — Controllers and orchestrators for auth, card, set, inventory, user, home
- **`CoreModule`** (`src/core/`) — Business logic: AuthModule, CardModule, EmailModule, InventoryModule, SetModule, UserModule

### Domain Entities vs ORM Entities

Domain entities (`src/core/`) are immutable value objects with constructor validation via `validateInit()`. ORM entities (`src/database/`) are TypeORM-decorated classes. Mappers bridge the two — never use ORM entities directly in services.

### Orchestrators

The orchestrator layer sits between controllers and services. It handles presentation concerns: assembling view DTOs, parsing query parameters into `SafeQueryOptions`, and mapping exceptions to HTTP responses. Controllers should remain thin; business logic goes in services, view assembly goes in orchestrators.

### Key Domain Policies

- **`PriceCalculationPolicy`** (`src/core/pricing/`) — All pricing logic: card value calculation (normal price with foil fallback), inventory valuation, set price tiers (base_price, total_price, base_price_all, total_price_all)
- **`AffiliateLinkPolicy`** (`src/core/affiliate/`) — Wraps TCGPlayer product URLs in our Impact partner shortlink (hardcoded constant `TCGPLAYER_AFFILIATE_BASE`). Same value is used in all environments since the shortlink is public (visible in every buy button's href) and doesn't differ between dev and prod. Called from card + sealed-product presenters. Raw product IDs come from Scry (MTGJSON `tcgplayerProductId` / `tcgplayerEtchedProductId`); URLs are never stored in affiliate-wrapped form.

### API error strings are an App Store surface (Guideline 3.1.1)

The iOS app renders `/api/v1` error messages verbatim as native alerts, so a
`4xx` body written here becomes on-screen text in a submitted app. **No error
body on a path the mobile app can reach may contain "Premium", "Upgrade",
"Free plan", a tier name, or a pricing URL** — state the limit neutrally (see
`price-alert.service.ts`) and let each client present it. The web frontend does
its own upgrade steering through its own UI. Violating this got the iOS app
rejected four times; details in the mobile repo's `GO-LIVE.md` §3H.

Exempt, because the mobile app cannot reach them:

- **API-key (developer-tier) traffic.** `ApiRateLimitGuard.checkApiKeyTier`
  returns a 429 naming the tier and an `upgrade: '/developer/pricing'` field.
  That branch requires `isApiKeyAuth`; the app authenticates with a bearer JWT
  and falls through to `checkBurst`, which has no tier wording. Keep the
  developer-facing message as-is — it is the right UX for that audience.
- **`src/mcp/`** — separate developer product, never shipped through an app store.

### Authentication

JWT-based auth using Passport.js. Guards: `JwtAuthGuard`, `LocalAuthGuard`, `OptionalJwtAuthGuard`. Tokens stored in HTTP cookies. New user registration uses a `pending_user` table for email verification with expiring tokens.

## Testing

Tests live in `test/` mirroring the `src/` structure. Test files use `*.spec.ts` (unit) and `*.e2e-spec.ts` (e2e). Services are tested by mocking repository ports. Coverage excludes DTOs, ORM entities, modules, and port interfaces. Path alias `src/*` is configured in both `tsconfig.json` and Jest's `moduleNameMapper`.

### Integration Tests

Integration tests run against a real PostgreSQL database via Docker. They exercise full request/response cycles through the NestJS app (controllers, orchestrators, services, repositories).

```bash
./scripts/test-integ.sh                        # Run all integration tests
./scripts/test-integ.sh --testPathPattern=transaction  # Run a single suite
```

The script handles container lifecycle automatically: starts a Postgres container on port 5433 (via `docker-compose.test.yml`), runs the schema init + migrations + seed data, executes Jest with `test/jest-e2e.json` config, and tears down the container on exit. Orphaned containers from previous runs are cleaned up on startup.

Test suites: `test/integration/*.e2e-spec.ts`. Seed data: `test/integration/seed.sql`. Test app bootstrap: `test/integration/setup.ts`.

## Database

**Production**: AWS Lightsail Managed PostgreSQL 18 (`iwantmymtg-db`). Connected via `DATABASE_URL` with SSL (`ssl: { rejectUnauthorized: false }` in TypeORM config). Backups and autovacuum are handled by the managed service. Migrations run directly via `run_migrations.sh` during deploy.

**Local dev**: PostgreSQL 18 via Docker (docker-compose.yml). Migrations run via `docker compose run --rm migrate`.

Schema defined in `docker/postgres/init/001_complete_schema.sql`. Migrations in `migrations/` (numbered sequentially). Core tables: `card`, `set`, `price`, `price_history`, `legality`, `inventory`, `user`, `pending_user`, `set_price`, `set_price_history`, `granular_price`, `deck`, `deck_card`, `published_deck`, `published_deck_card`, `buy_list`, `refresh_token`, `notification_device`. (`granular_price_history` was dropped in migration 042 - see ROADMAP §10.10.) The `published_deck*` tables are a read-only tournament-deck catalog written by Scry's `ingest-decks` command (fbettega feed); the web app only reads them.

### Price History

Both card prices and set prices have historical tracking:
- **Card price history** (`price_history`) — daily snapshots of card normal/foil prices, populated during price ingestion
- **Set price history** (`set_price_history`) — daily snapshots of set price tiers (base_price, total_price, base_price_all, total_price_all), populated during `post-ingest-updates` via `update_set_prices()`

Both tables use the same retention policy (applied via `cargo run -- retention`): keep daily data for 7 days, weekly (Mondays) for 7-28 days, monthly (1st of month) beyond 28 days. UPSERT queries use COALESCE to preserve existing non-null values when new data has nulls.

TypeORM is configured with `synchronize: false` — all schema changes must go through migration files.

## Views

Server-side rendered using Handlebars (`src/http/views/`). Layouts in `views/layouts/`, partials in `views/partials/`. Styled with Tailwind CSS (source in `src/http/styles/`, compiled to `src/http/public/css/`). Custom Handlebars helpers registered in `main.ts`: `toUpperCase`, `toLowerCase`, `capitalize`, `eq`, `gt`, `lt`.

When adding a paginated list, use the established pagination component (`src/http/views/partials/pagination.hbs` plus the `initListPage` AJAX flow in `src/http/public/js/ajaxUtils.js`) for visual consistency across the app, unless there's a specific reason not to. The published-decks page is the one intentional exception: it uses horizontal per-format rows with AJAX side-scroll instead of standard pagination.

## CI/CD

See the Production section above for the full pipeline. The workflow is defined in `.github/workflows/deploy.yml`.

## Environment

**Production**: `DATABASE_URL` (Lightsail managed DB connection string with `?sslmode=require`), `JWT_SECRET`, `NODE_ENV`, `SCRY_LOG` (passed to ETL container), `SMTP_*` (email config), `APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `STRIPE_DISPLAY_PRICE_MONTHLY`, `STRIPE_DISPLAY_PRICE_ANNUAL` (Stripe billing — when secrets are unset, billing actions return an error notice / redirect with `?error=checkout_failed` rather than a 500, and the webhook endpoint (`POST /api/v1/billing/webhooks/stripe`) returns 500 for `StripeConfigurationError` so Stripe retries and 400 only for invalid signatures; the display-price vars feed the `/billing` page and must be kept in sync with the actual Stripe price amounts — when unset, fall back to `$3.99` / `$39.99`). TCGPlayer buy buttons use a hardcoded Impact partner base URL in `AffiliateLinkPolicy` and are not configured via an environment variable.

**Local dev**: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (for Docker postgres), or individual `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` vars. See `.env.example`.

**Local secret injection**: Local env vars / secrets are managed via `noenvy` (not a checked-in `.env`). Wrap any `docker compose` command that interpolates `${VAR}` from `docker-compose.yml` with `noenvy run -- ...` — i.e. `up`, `build`, `run`, `create`. Commands that operate on existing containers (`restart`, `exec`, `logs`, `ps`) don't need the wrapper; they'll print "variable not set" warnings but work fine since the container's env was populated at create time. CI/CD and production do not use noenvy — GitHub Actions populates env from `secrets.*` and the Lightsail deploy script sets env on the server before `docker compose` runs. When adding a new local var to noenvy, also add it to the GH Actions workflow and deploy script, otherwise CI/prod silently get an empty string.

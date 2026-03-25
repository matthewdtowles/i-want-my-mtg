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

### Testing

```bash
npm test                          # Run unit tests (Jest, maxWorkers=50%)
npm test -- --testPathPattern='card.service'  # Run a single test file
npm run test:e2e                  # E2E tests (separate jest config: test/jest-e2e.json)
npm run test:cov                  # Tests with coverage
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
1. **test** — Runs unit and integration tests
2. **tag** — Creates a GitHub release from `package.json` version
3. **build** — Builds Docker image using the `production` target and pushes to `ghcr.io`
4. **deploy** — SSH deploy to Lightsail via `.github/scripts/deploy.sh`

The production Docker build (`target: production`) runs `npm run build:prod` which produces the final `dist/` directory with compiled TS, minified assets, and versioned service worker. The production stage copies only `dist/` and production dependencies.

### Service Worker & Cache Busting

The service worker (`src/http/public/sw.js`) uses a `__APP_VERSION__` placeholder that `build:sw` replaces with the version from `package.json`. When the version changes, the new SW activates and purges old caches. To bump the version: `npm run bump` (patch), `bump:minor`, or `bump:major`.

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

Schema defined in `docker/postgres/init/001_complete_schema.sql`. Migrations in `migrations/` (numbered sequentially). Core tables: `card`, `set`, `price`, `price_history`, `legality`, `inventory`, `user`, `pending_user`, `set_price`, `set_price_history`.

### Price History

Both card prices and set prices have historical tracking:
- **Card price history** (`price_history`) — daily snapshots of card normal/foil prices, populated during price ingestion
- **Set price history** (`set_price_history`) — daily snapshots of set price tiers (base_price, total_price, base_price_all, total_price_all), populated during `post-ingest-updates` via `update_set_prices()`

Both tables use the same retention policy (applied via `cargo run -- retention`): keep daily data for 7 days, weekly (Mondays) for 7-28 days, monthly (1st of month) beyond 28 days. UPSERT queries use COALESCE to preserve existing non-null values when new data has nulls.

TypeORM is configured with `synchronize: false` — all schema changes must go through migration files.

## Views

Server-side rendered using Handlebars (`src/http/views/`). Layouts in `views/layouts/`, partials in `views/partials/`. Styled with Tailwind CSS (source in `src/http/styles/`, compiled to `src/http/public/css/`). Custom Handlebars helpers registered in `main.ts`: `toUpperCase`, `toLowerCase`, `capitalize`, `eq`, `gt`, `lt`.

## CI/CD

See the Production section above for the full pipeline. The workflow is defined in `.github/workflows/deploy.yml`.

## Environment

**Production**: `DATABASE_URL` (Lightsail managed DB connection string with `?sslmode=require`), `JWT_SECRET`, `NODE_ENV`, `SCRY_LOG` (passed to ETL container), `SMTP_*` (email config), `APP_URL`.

**Local dev**: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (for Docker postgres), or individual `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` vars. See `.env.example`.

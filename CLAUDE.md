# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

I Want My MTG is a Magic: The Gathering collection tracker. It has two components:
- **NestJS web app** (`src/`) — TypeScript backend with server-rendered Handlebars views, PostgreSQL via TypeORM
- **Scry CLI** (`scry/`) — Rust ETL tool that ingests MTG data from Scryfall API into the database (has its own `scry/CLAUDE.md`)

## Common Commands

### NestJS (web app)

```bash
npm test                          # Run unit tests (Jest, maxWorkers=50%)
npm test -- --testPathPattern='card.service'  # Run a single test file
npm run test:e2e                  # E2E tests (separate jest config: test/jest-e2e.json)
npm run test:cov                  # Tests with coverage
npm run lint                      # ESLint with --fix
npm run format                    # Prettier formatting
npm run format:check              # Check formatting without fixing
npm run build                     # nest build (TypeScript compilation)
npm run build:css                 # Build Tailwind CSS
npm run start:dev                 # Watch mode for development
```

### Scry (Rust ETL)

```bash
cd scry && cargo test             # Run Rust tests
cd scry && cargo build --release  # Production build
cd scry && cargo run -- ingest    # Ingest sets, cards, prices from Scryfall
cd scry && cargo run -- cleanup -c  # Post-ingest data cleanup
cd scry && cargo run -- health    # Check data integrity
cd scry && cargo run -- retention # Apply price_history retention policy
```

### Docker (full stack)

```bash
docker compose up -d              # Start dev environment (web, postgres, adminer, mailhog)
docker compose exec web npm test  # Run tests in container
docker compose run --rm etl cargo run -- ingest  # Run ETL
docker compose run --rm migrate   # Execute database migrations
```

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

**Port-Adapter pattern**: Services depend on repository port interfaces (e.g., `CardRepositoryPort`). Concrete implementations are bound in `DatabaseModule` via NestJS DI:
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

### Scry CLI Architecture

Modular Rust CLI using Clap. Main modules: `card/`, `set/`, `price/`, `health_check/`. Uses SQLx for type-safe database queries, streaming JSON parsing (actson) for memory-efficient Scryfall bulk data processing, and tokio async runtime. See `scry/CLAUDE.md` for detailed Scry architecture.

## Testing

Tests live in `test/` mirroring the `src/` structure. Test files use `*.spec.ts` (unit) and `*.e2e-spec.ts` (e2e). Services are tested by mocking repository ports. Coverage excludes DTOs, ORM entities, modules, and port interfaces. Path alias `src/*` is configured in both `tsconfig.json` and Jest's `moduleNameMapper`.

## Database

PostgreSQL 15. Schema defined in `docker/postgres/init/001_complete_schema.sql`. Migrations in `docker/postgres/migrations/` (numbered sequentially, run via `docker compose run --rm migrate`). Core tables: `card`, `set`, `price`, `price_history`, `legality`, `inventory`, `user`, `pending_user`, `set_price`.

TypeORM is configured with `synchronize: false` — all schema changes must go through migration files.

## Views

Server-side rendered using Handlebars (`src/http/views/`). Layouts in `views/layouts/`, partials in `views/partials/`. Styled with Tailwind CSS (source in `src/http/styles/`, compiled to `src/http/public/css/`). Custom Handlebars helpers registered in `main.ts`: `toUpperCase`, `toLowerCase`, `capitalize`, `eq`, `gt`, `lt`.

## CI/CD

GitHub Actions workflow (`.github/workflows/deploy.yml`) on push to main:
1. **test** — Runs `npm test` in Docker
2. **build** — Builds and pushes Docker images (web + etl) to `ghcr.io`
3. **deploy** — SSH deploy to Lightsail via `.github/scripts/deploy.sh`

## Environment

Key env vars (see `.env.example`): `DATABASE_URL` (or individual `DB_*` vars), `JWT_SECRET`, `NODE_ENV`, `SCRY_LOG` (Rust log level), `SMTP_*` (email config), `APP_URL`. Docker Postgres also needs `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`.

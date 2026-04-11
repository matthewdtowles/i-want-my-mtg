# I Want My MTG

A web app for tracking Magic: The Gathering collections. NestJS + Handlebars + PostgreSQL. The ETL tool ([Scry](https://github.com/matthewdtowles/scry)) lives in a separate repository.

See [CLAUDE.md](./CLAUDE.md) for architecture, module layout, and deployment details.

## Quick Start

```bash
npm run setup
```

This creates `.env` from `.env.example` (prompting you to fill in values), starts all Docker services, waits for PostgreSQL, and runs migrations.

After setup:

- **Web app** — <http://localhost:3000>
- **Adminer** (DB admin) — <http://localhost:8080>
- **MailHog** (email capture) — <http://localhost:8025>

After any code change, rebuild and restart:

```bash
docker compose build web && docker compose up -d web
```

## Common Commands

| Command                | What it does                                   |
| ---------------------- | ---------------------------------------------- |
| `npm run setup`        | Full dev environment setup                     |
| `npm run migrate`      | Run pending database migrations                |
| `npm run reset-db`     | Destroy and recreate the database              |
| `npm run db-backup`    | Back up the database to `backup_<timestamp>.sql` |
| `npm run logs`         | Follow `web` logs (pass a service name for others) |
| `npm run etl -- ingest` | Run the Scry ETL via Docker                   |
| `npm run lint`         | ESLint with `--fix`                            |
| `npm run format`       | Prettier write                                 |
| `npm run format:check` | Prettier check (no writes)                     |

## Testing

```bash
npm test                                             # Unit tests
npm test -- --testPathPattern='card.service'         # Single unit test file
npm run test:watch                                   # Unit tests in watch mode
npm run test:cov                                     # Unit tests with coverage
npm run test:frontend                                # Frontend JS unit tests (jsdom)
npm run test:integ                                   # Integration tests (Docker lifecycle)
npm run test:integ -- --testPathPattern=transaction  # Single integration suite
npm run test:pw:full                                 # Playwright E2E (starts app + DB)
npm run test:pw                                      # Playwright (app must already be running)
npm run test:pw:ui                                   # Playwright UI mode
```

## ETL (Scry)

Scry runs locally via the published Docker image. Common commands:

```bash
npm run etl -- ingest               # Full ingest (sets, cards, prices)
npm run etl -- post-ingest-prune    # Prune unwanted ingested data
npm run etl -- post-ingest-updates  # Update set sizes, prices, portfolio snapshots
npm run etl -- health               # Data integrity check
npm run etl -- retention            # Apply price_history retention policy
```

Flags pass through: `npm run etl -- ingest -p` for prices only, `npm run etl -- ingest -k mh3` for one set. Run `npm run etl` alone for the full list, or see the [Scry README](https://github.com/matthewdtowles/scry).

## Database

```bash
npm run migrate              # Run pending migrations
npm run reset-db             # Destroy and recreate database
npm run db-backup            # Backup to backup_<timestamp>.sql
npm run db-backup -- my.sql  # Custom filename
```

Connect to psql directly:

```bash
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

## Lighthouse Audits

```bash
npm run lighthouse                              # Audit localhost:3000 (public pages)
npm run lighthouse -- --auth                    # Include authenticated pages
npm run lighthouse -- --category=performance    # Performance only
npm run lighthouse:prod                         # Audit iwantmymtg.net
```

Reports land in `lighthouse-reports/<timestamp>/{mobile,desktop}/`. Requires Chrome/Chromium (`lighthouse` is invoked via `npx`).

## Versioning

Conventional Commits for messages, manual bumps via npm scripts — include the bump in your PR commit.

```bash
npm run bump          # Patch: 1.0.0 → 1.0.1
npm run bump:minor    # Minor: 1.0.0 → 1.1.0
npm run bump:major    # Major: 1.0.0 → 2.0.0
npm run bump:dev      # Pre-release: 1.0.0 → 1.0.1-rc.0
```

## Troubleshooting

**Docker port already in use** — another process (often a stray container) is holding the port you need:

```bash
npm run free-docker-port        # defaults to 3000
npm run free-docker-port -- 5432
```

**Need an internal API key** — e.g., to populate `INTERNAL_API_KEY` in `.env` for local testing of the price-alerts endpoint:

```bash
npm run gen-api-key
```

**Stale Docker build** — if `docker compose build web` seems to ignore a change, force a clean rebuild:

```bash
docker compose build web --no-cache && docker compose up -d web
```

**Reset everything** — nuke containers, volumes, and the local database:

```bash
docker compose down -v
npm run setup
```

## Deploy

CI/CD runs via GitHub Actions on push to `main` and SSH-deploys to AWS Lightsail. See `.github/workflows/deploy.yml` and [CLAUDE.md](./CLAUDE.md) for the full pipeline, including how the Scry binary is extracted from its Docker image on the production host.

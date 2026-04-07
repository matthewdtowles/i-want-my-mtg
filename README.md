# I Want My MTG

## Overview

"I Want My MTG" is a project for managing and viewing Magic: The Gathering collections.

## Quick Start

```bash
./scripts/setup.sh
```

This will:

1. Create `.env` from `.env.example` (if missing) and prompt you to fill in values
2. Build and start all Docker services
3. Wait for PostgreSQL to be healthy
4. Run database migrations

After setup, the app is available at:

- **Web app**: <http://localhost:3000>
- **Adminer** (DB admin): <http://localhost:8080>
- **MailHog** (email capture): <http://localhost:8025>

## Developer Scripts

All scripts are in the `scripts/` directory and designed to be run from the project root.

| Script                    | Description                              |
| ------------------------- | ---------------------------------------- |
| `./scripts/setup.sh`      | Full dev environment setup               |
| `./scripts/etl.sh`        | Run Scry ETL commands                    |
| `./scripts/logs.sh`       | View Docker service logs                 |
| `./scripts/migrate.sh`    | Run database migrations                  |
| `./scripts/reset-db.sh`   | Destroy and recreate the database        |
| `./scripts/db-backup.sh`  | Back up database to a SQL file           |
| `./scripts/test-integ.sh` | Run integration tests (requires Docker)  |
| `./scripts/lint.sh`       | Run linting and format checks            |
| `./scripts/lighthouse.sh` | Run Lighthouse audits (mobile + desktop) |

### Testing

```bash
npm test                                                  # All unit tests
npm test -- --testPathPattern='card.service'              # Single test file
npm run test:watch                                        # Unit tests in watch mode
npm run test:cov                                          # Unit tests with coverage
npm run test:frontend                                     # Frontend JS unit tests (jsdom)
npm run test:integ                                        # Integration tests (Docker)
npm run test:integ -- --testPathPattern=transaction       # Single integration suite
npm run test:integ:jest                                   # Integration tests (Jest only, DB must be on port 5433)
npm run test:pw:full                                      # Playwright E2E (starts app + DB, runs tests)
npm run test:pw                                           # Playwright tests (app must already be running)
npm run test:pw:ui                                        # Playwright interactive UI mode
npm run test:pw:headed                                    # Playwright headed mode
npm run test:pw:report                                    # Open last Playwright report
```

### ETL (Scry)

The Scry ETL tool lives in a [separate repository](https://github.com/matthewdtowles/scry). To run it locally via Docker:

```bash
npm run etl -- ingest               # Full ingest (sets, cards, prices + auto prune/updates)
npm run etl -- post-ingest-prune    # Prune unwanted ingested data
npm run etl -- post-ingest-updates  # Update set sizes, prices, and portfolio snapshots
npm run etl -- cleanup              # Remove filtered sets/cards
npm run etl -- health               # Data integrity check
npm run etl -- retention            # Apply price_history retention policy
npm run etl -- backfill             # Backfill price_history from MTGJSON (one-time)
npm run etl -- truncate-history     # Clear price history (requires confirmation)
npm run etl -- portfolio-summary    # Refresh portfolio value snapshots for all users
```

Flags can be passed to any command (e.g., `npm run etl -- ingest -p` for prices only, `npm run etl -- ingest -k mh3` for a specific set). Run `npm run etl` with no arguments to see all available commands. See the [Scry README](https://github.com/matthewdtowles/scry) for full command and flag documentation.

### Logs

```bash
./scripts/logs.sh              # Follow web logs (default)
./scripts/logs.sh postgres     # Follow postgres logs
./scripts/logs.sh all          # Follow all service logs
```

### Linting

```bash
./scripts/lint.sh              # Lint (with --fix) + format check
./scripts/lint.sh fix          # Lint (with --fix) + format write
```

### Lighthouse Audits

Run Lighthouse performance, accessibility, best practices, and SEO audits against all key pages. Reports are generated for both mobile and desktop.

```bash
npm run lighthouse                              # Audit localhost:3000 (public pages)
npm run lighthouse -- --auth                    # Include authenticated pages (prompts for credentials)
npm run lighthouse -- --base-url=https://...    # Audit a remote URL
npm run lighthouse -- --category=performance    # Only run performance audits
npm run lighthouse:prod                         # Audit iwantmymtg.net (production)
```

Requires Chrome/Chromium and `lighthouse` (`npm install -g lighthouse` or it uses `npx`).

Reports are saved to `lighthouse-reports/<timestamp>/` with separate `mobile/` and `desktop/` directories, each containing:

- HTML reports (open in browser for full details)
- JSON reports (for programmatic comparison)
- `summary.csv` and `summary.txt` (score overview)

### Database

```bash
./scripts/migrate.sh           # Run pending migrations
./scripts/reset-db.sh          # Destroy and recreate database
./scripts/db-backup.sh         # Backup to backup_<timestamp>.sql
./scripts/db-backup.sh my.sql  # Backup to custom filename
```

## Docker Commands

### Development

After any code change, rebuild and restart:

```bash
docker compose build web && docker compose up -d web
```

This runs `build:prod` inside Docker which handles everything: clean dist, build mana font, compile TypeScript, minify CSS, minify JS, inject service worker version. No need to run individual build scripts.

Other commands:

```bash
docker compose up -d               # Start all services
docker compose down                # Stop all services
docker compose down -v             # Stop and destroy volumes (nuclear option)
docker compose exec web npm test   # Run tests in container
docker compose run --rm migrate    # Run database migrations
```

### Database Operations

```bash
# Connect to psql
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# Backup (or use ./scripts/db-backup.sh)
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

### Email Testing

Local development uses [MailHog](https://github.com/mailhog/MailHog) to capture outgoing emails (e.g., registration verification). All emails sent by the app are intercepted and viewable in the MailHog web UI:

- **Web UI**: <http://localhost:8025>
- **SMTP**: `localhost:1025` (configured automatically in Docker)

MailHog starts with `docker compose up -d`. No additional configuration needed.

## Versioning

This project uses [Conventional Commits](https://www.conventionalcommits.org/) and manual version bumps via npm scripts. Version numbers are tracked in `package.json` and updated before merging to `main`.

### Bumping the Version

```bash
npm run bump          # Patch bump (1.0.0 → 1.0.1) - bug fixes, minor changes
npm run bump:minor    # Minor bump (1.0.0 → 1.1.0) - new features
npm run bump:major    # Major bump (1.0.0 → 2.0.0) - breaking changes
npm run bump:dev      # Pre-release bump (1.0.0 → 1.0.1-rc.0) - RC/dev builds
```

These commands update the `version` field in `package.json` without creating a git tag. Include the version bump in your PR commit.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

| Type                                                     | Use For                | Version Bump |
| -------------------------------------------------------- | ---------------------- | ------------ |
| `fix:`                                                   | Bug fixes              | Patch        |
| `feat:`                                                  | New features           | Minor        |
| `feat!:` or `BREAKING CHANGE` footer                     | Breaking changes       | Major        |
| `docs:`, `chore:`, `refactor:`, `test:`, `style:`, `ci:` | Non-functional changes | Patch        |

### Tips

- Use the type that best describes the change - `feat` for new functionality, `fix` for bug fixes
- Scope is optional but useful: `feat(transactions): add FIFO cost basis`
- Run the appropriate bump command before opening your PR
- If a PR includes multiple types of changes, bump to the highest level (e.g., any `feat:` = minor bump)

## Build & Deploy

### Build Scripts

`build:prod` is the single build command used by Docker and CI. It runs all sub-steps in order: clean dist, build mana font, compile TypeScript, minify CSS, minify JS, inject service worker version. You should not need to run individual build scripts directly.

For local development outside Docker:

```bash
npm run build:assets              # Rebuild CSS/JS/SW without recompiling TS
npm run build:css                 # Rebuild Tailwind CSS only (after style changes)
npm run start:dev                 # Watch mode (builds SW + nest watch)
```

### Service Worker & Cache Busting

The service worker (`src/http/public/sw.js`) uses a `__APP_VERSION__` placeholder that `build:sw` replaces with the version from `package.json`. When the version changes, the new SW activates and purges old caches.

### Production ETL (Scry)

In production, Scry runs as a native binary extracted from its Docker image — not via Docker Compose. During deploy, `setup-cron.sh` pulls the latest Scry image, copies the binary to `/opt/scripts/scry`, and installs cron jobs.

**Scheduled jobs** (defined in `cron/i-want-my-mtg`):

| Schedule              | Command                           | Description                          |
| --------------------- | --------------------------------- | ------------------------------------ |
| Daily at 2:00 AM      | `scry ingest`                     | Full data ingestion from Scryfall    |
| Daily at 2:15 AM      | `curl -H "x-api-key: $INTERNAL_API_KEY" .../price-alerts/process` | Process price alert notifications |
| Daily at 2:30 AM      | `scry portfolio-summary`          | Refresh portfolio value snapshots    |
| Weekly Sunday 3:00 AM | `scry retention`                  | Apply price history retention policy |
| Weekly Sunday 4:00 AM | `clean_logs.sh`                   | Rotate app and Docker logs           |

The price alert endpoint requires the `x-api-key` header set to `INTERNAL_API_KEY` from `.env`. Generate with `./scripts/gen-api-key.sh`.

**Manual run** (SSH into the server):

```bash
/opt/scripts/scry.sh ingest              # Full ingest
/opt/scripts/scry.sh retention           # Run retention manually
/opt/scripts/scry.sh <command> [flags]   # Any scry command
```

The wrapper script (`cron/scry.sh`) sources `~/.env` for `DATABASE_URL` and runs the binary at `/opt/scripts/scry`. Logs are written to `/var/log/i-want-my-mtg/`.

To update the Scry binary to the latest version, re-run the deploy pipeline or manually run `setup-cron.sh`.

### Production Deploy

Deploys automatically via GitHub Actions on push to `main`:

1. **test** - Runs unit and integration tests
2. **tag** - Creates a GitHub release from `package.json` version
3. **build** - Builds Docker image using the `production` target and pushes to `ghcr.io`
4. **deploy** - SSH deploy to Lightsail via `.github/scripts/deploy.sh`

See `.github/workflows/deploy.yml` for full pipeline.

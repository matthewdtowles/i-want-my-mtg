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

| Script | Description |
| ------ | ----------- |
| `./scripts/setup.sh` | Full dev environment setup |
| `./scripts/etl.sh` | Run Scry ETL commands |
| `./scripts/logs.sh` | View Docker service logs |
| `./scripts/migrate.sh` | Run database migrations |
| `./scripts/reset-db.sh` | Destroy and recreate the database |
| `./scripts/db-backup.sh` | Back up database to a SQL file |
| `./scripts/test-integ.sh` | Run integration tests (requires Docker) |
| `./scripts/lint.sh` | Run linting and format checks |

### Testing

```bash
npm test                                           # All unit tests
npm test -- --testPathPattern='card.service'       # Single test file
npm run test:e2e                                   # E2E tests
npm run test:cov                                   # Unit tests with coverage
npm run test:integ                                 # Integration tests (Docker)
npm run test:integ -- --testPathPattern=transaction   # Single integration suite
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

### Database

```bash
./scripts/migrate.sh           # Run pending migrations
./scripts/reset-db.sh          # Destroy and recreate database
./scripts/db-backup.sh         # Backup to backup_<timestamp>.sql
./scripts/db-backup.sh my.sql  # Backup to custom filename
```

## Manual Docker Commands

These are the underlying commands if you need more control.

### Services

```bash
docker compose up -d               # Start all services
docker compose down                # Stop all services
docker compose down -v             # Stop and destroy volumes (nuclear option)
docker compose restart web         # Restart web app
docker compose build web           # Rebuild after dependency changes
```

### Database Operations

```bash
# Connect to psql
docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"

# Backup (or use ./scripts/db-backup.sh)
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql

# Run migrations
docker compose run --rm migrate
```

### Tests (via Docker)

```bash
docker compose exec web npm test
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
npm run bump          # Patch bump (1.0.0 → 1.0.1) — bug fixes, minor changes
npm run bump:minor    # Minor bump (1.0.0 → 1.1.0) — new features
npm run bump:major    # Major bump (1.0.0 → 2.0.0) — breaking changes
```

These commands update the `version` field in `package.json` without creating a git tag. Include the version bump in your PR commit.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

| Type | Use For | Version Bump |
| ---- | ------- | ------------ |
| `fix:` | Bug fixes | Patch |
| `feat:` | New features | Minor |
| `feat!:` or `BREAKING CHANGE` footer | Breaking changes | Major |
| `docs:`, `chore:`, `refactor:`, `test:`, `style:`, `ci:` | Non-functional changes | Patch |

### Tips

- Use the type that best describes the change — `feat` for new functionality, `fix` for bug fixes
- Scope is optional but useful: `feat(transactions): add FIFO cost basis`
- Run the appropriate bump command before opening your PR
- If a PR includes multiple types of changes, bump to the highest level (e.g., any `feat:` = minor bump)

## Build & Deploy

### Production (Web)

Deploys automatically via GitHub Actions on push to `main`. See `.github/workflows/deploy.yml`.
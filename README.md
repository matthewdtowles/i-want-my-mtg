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
- **Web app**: http://localhost:3000
- **Adminer** (DB admin): http://localhost:8080
- **MailHog** (email capture): http://localhost:8025

## Developer Scripts

All scripts are in the `scripts/` directory and designed to be run from the project root.

| Script | Description |
|--------|-------------|
| `./scripts/setup.sh` | Full dev environment setup |
| `./scripts/etl.sh` | Run Scry ETL commands |
| `./scripts/logs.sh` | View Docker service logs |
| `./scripts/migrate.sh` | Run database migrations |
| `./scripts/reset-db.sh` | Destroy and recreate the database |
| `./scripts/db-backup.sh` | Back up database to a SQL file |
| `./scripts/lint.sh` | Run linting and format checks |

### Testing

```bash
npm test                                          # All unit tests
npm test -- --testPathPattern='card.service'       # Single test file
npm run test:e2e                                   # E2E tests
npm run test:cov                                   # Unit tests with coverage
cd scry && cargo test                              # Scry (Rust) tests
```

### ETL (Scry)

```bash
./scripts/etl.sh ingest           # Full ingest (sets, cards, prices)
./scripts/etl.sh ingest -s        # Sets only
./scripts/etl.sh ingest -c        # Cards only
./scripts/etl.sh ingest -p        # Prices only
./scripts/etl.sh ingest -k mh3    # Cards for specific set
./scripts/etl.sh health           # Data integrity check
./scripts/etl.sh health --detailed
./scripts/etl.sh cleanup -c       # Clean up filtered sets/cards
./scripts/etl.sh retention        # Apply price_history retention
```

### Logs

```bash
./scripts/logs.sh              # Follow web logs (default)
./scripts/logs.sh postgres     # Follow postgres logs
./scripts/logs.sh all          # Follow all service logs
```

### Linting

```bash
./scripts/lint.sh              # Check lint + formatting
./scripts/lint.sh fix          # Auto-fix lint + formatting
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
docker exec -it i-want-my-mtg-postgres-1 psql -U iwmm_pg_user -d i_want_my_mtg

# Backup
docker compose exec postgres pg_dump -U postgres i_want_my_mtg > backup.sql

# Run migrations
docker compose run --rm migrate
```

### Tests (via Docker)

```bash
docker compose exec web npm test
docker compose run --rm etl cargo test
```

### ETL (via Docker)

```bash
docker compose run --rm etl cargo run -- <command>
```

### Email Testing

Local development uses [MailHog](https://github.com/mailhog/MailHog) to capture outgoing emails (e.g., registration verification). All emails sent by the app are intercepted and viewable in the MailHog web UI:

- **Web UI**: http://localhost:8025
- **SMTP**: `localhost:1025` (configured automatically in Docker)

MailHog starts with `docker compose up -d`. No additional configuration needed.

## Scry CLI Commands

Scry is the Rust ETL tool that ingests MTG data from the Scryfall API. Run commands via Docker or directly if built locally:

```bash
# Via Docker
docker compose run --rm etl cargo run -- <command>

# Via script
./scripts/etl.sh <command>

# Directly (if built locally)
./scry <command>
```

### `ingest` — Ingest MTG data from Scryfall

With no flags, ingests all sets, cards, and prices. Automatically runs post-ingest pruning and updates afterward.

```bash
scry ingest              # Ingest everything (sets, cards, prices)
scry ingest -s           # Ingest sets only
scry ingest -c           # Ingest cards only
scry ingest -p           # Ingest prices only
scry ingest -k <CODE>    # Ingest cards for a specific set (e.g., -k mh3)
scry ingest -r           # Reset all data before ingesting (requires confirmation)
```

Flags can be combined, e.g. `scry ingest -s -p` to ingest sets and prices.

### `post-ingest-prune` — Prune unwanted ingested data

Removes foreign cards without prices, sets missing price data, empty sets, and duplicate foil cards. Runs automatically after `ingest`, but can be run standalone.

```bash
scry post-ingest-prune
```

### `post-ingest-updates` — Update set sizes and prices

Fixes main set misclassifications, calculates set sizes, and updates set prices. Runs automatically after `ingest`, but can be run standalone.

```bash
scry post-ingest-updates
```

### `cleanup` — Remove previously saved sets/cards

Only necessary if filtering rules have been updated to exclude sets or cards that were already ingested.

```bash
scry cleanup             # Clean up sets based on set filtering rules
scry cleanup -c          # Also clean up individual cards based on card filtering rules
scry cleanup -c -n 1000  # Card cleanup with custom batch size (default: 500)
```

### `health` — Check data integrity

```bash
scry health              # Basic health check
scry health --detailed   # Detailed health check
scry health --price-history  # Check price_history table health (bloat, vacuum, retention)
```

### `retention` — Apply price_history retention policy

Applies a tiered retention policy: keeps daily rows for 7 days, weekly (Mondays) for 7-28 days, and monthly (1st of month) for 28+ days.

```bash
scry retention
```

### `truncate-history` — Truncate the price_history table

Deletes all data from the price_history table. Requires interactive confirmation.

```bash
scry truncate-history
```

## Build & Deploy

### Production (Scry)

```bash
cd scry
cargo build --release
strip target/release/scry || true
./target/release/scry --version
scp target/release/scry lightsail-iwmm:~/
ssh lightsail-iwmm
./scry.sh
```

### Production (Web)

Deploys automatically via GitHub Actions on push to `main`. See `.github/workflows/deploy.yml`.

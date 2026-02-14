# I Want My MTG

## Overview

"I Want My MTG" is a project for managing and viewing Magic: The Gathering collections.

## Development Workflow

### Initial Setup

#### Copy Env File

`cp .env.example. .env`

- Add values to new `.env` file

#### Start Dev Env

`docker compose up -d`

#### View Logs

`docker compose logs -f web`

#### Run ETL (See Scry CLI Commands below)

`docker compose run --rm etl cargo run -- <command>`

#### Run Tests

```Docker
docker compose exec web npm test
docker compose exec etl cargo test
```

#### Check Email (MailHog)

Local development uses [MailHog](https://github.com/mailhog/MailHog) to capture outgoing emails (e.g., registration verification). All emails sent by the app are intercepted and viewable in the MailHog web UI:

- **Web UI**: [http://localhost:8025](http://localhost:8025)
- **SMTP**: `localhost:1025` (configured automatically in Docker)

MailHog starts with `docker compose up -d`. No additional configuration needed.

#### Rebuild (For Dependency Changes)

```Docker
docker compose build web
docker compose up -d web
```

### Database Management

#### Database Backup

`docker compose exec postgres pg_dump -U postgres i_want_my_mtg > backup.sql`

#### Reset Database

```Docker
docker compose down -v
docker compose up -d postgres
```

### Database operations

`docker exec -it i-want-my-mtg-postgres-1 psql -U iwmm_pg_user -d i_want_my_mtg`

### Debugging

#### Restart Web App

`docker compose restart web`

#### Rebuild after package.json Change

`docker compose build web`

#### Nuclear option - fresh start

`docker compose down -v`

#### Stop Everything

`docker compose down`

#### Clean up unused containers/images

`docker system prune`

#### Execute Migrations

`docker compose run --rm migrate`

#### Clean Up/Reset

```Docker
docker compose down -v
docker system prune -a
```

### Production

#### Deploy (if using script)

`./deploy.sh`

#### Check Status

`docker compose -f docker compose.prod.yml ps`

#### View Logs Prod Web

`docker compose -f docker compose.prod.yml logs web`

#### Run ETL Manually

`docker compose -f docker compose.prod.yml run --rm etl`

#### Update Single Service

```Docker
docker compose -f docker compose.prod.yml pull web
docker compose -f docker compose.prod.yml up -d web
```

### Scry CLI Commands

Scry is the Rust ETL tool that ingests MTG data from the Scryfall API. Run commands via Docker or directly if built locally:

```bash
# Via Docker
docker compose run --rm etl cargo run -- <command>

# Directly (if built locally)
./scry <command>
```

#### `ingest` — Ingest MTG data from Scryfall

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

#### `post-ingest-prune` — Prune unwanted ingested data

Removes foreign cards without prices, sets missing price data, empty sets, and duplicate foil cards. Runs automatically after `ingest`, but can be run standalone.

```bash
scry post-ingest-prune
```

#### `post-ingest-updates` — Update set sizes and prices

Fixes main set misclassifications, calculates set sizes, and updates set prices. Runs automatically after `ingest`, but can be run standalone.

```bash
scry post-ingest-updates
```

#### `cleanup` — Remove previously saved sets/cards

Only necessary if filtering rules have been updated to exclude sets or cards that were already ingested.

```bash
scry cleanup             # Clean up sets based on set filtering rules
scry cleanup -c          # Also clean up individual cards based on card filtering rules
scry cleanup -c -n 1000  # Card cleanup with custom batch size (default: 500)
```

#### `health` — Check data integrity

```bash
scry health              # Basic health check
scry health --detailed   # Detailed health check
scry health --price-history  # Check price_history table health (bloat, vacuum, retention)
```

#### `retention` — Apply price_history retention policy

Applies a tiered retention policy: keeps daily rows for 7 days, weekly (Mondays) for 7-28 days, and monthly (1st of month) for 28+ days.

```bash
scry retention
```

#### `truncate-history` — Truncate the price_history table

Deletes all data from the price_history table. Requires interactive confirmation.

```bash
scry truncate-history
```

### Build & Deploy Scry Release

```bash
cd scry
cargo build --release
strip target/release/scry || true
./target/release/scry --version
scp target/release/scry lightsail-iwmm:~/
# Run ETL:
ssh lightsail-iwmm
./scry.sh
```

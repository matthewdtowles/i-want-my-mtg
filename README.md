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
| `./scripts/lint.sh` | Run linting and format checks |

### Testing

```bash
npm test                                          # All unit tests
npm test -- --testPathPattern='card.service'       # Single test file
npm run test:e2e                                   # E2E tests
npm run test:cov                                   # Unit tests with coverage
```

### ETL (Scry)

The Scry ETL tool lives in a [separate repository](https://github.com/matthewdtowles/scry). To run it locally via Docker:

```bash
./scripts/etl.sh ingest           # Full ingest (sets, cards, prices)
./scripts/etl.sh ingest -s        # Sets only
./scripts/etl.sh health           # Data integrity check
./scripts/etl.sh retention        # Apply retention policy
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
```

### Email Testing

Local development uses [MailHog](https://github.com/mailhog/MailHog) to capture outgoing emails (e.g., registration verification). All emails sent by the app are intercepted and viewable in the MailHog web UI:

- **Web UI**: <http://localhost:8025>
- **SMTP**: `localhost:1025` (configured automatically in Docker)

MailHog starts with `docker compose up -d`. No additional configuration needed.

## Versioning

This project uses [Conventional Commits](https://www.conventionalcommits.org/) to automatically determine version bumps. When commits are merged to `main`, GitHub Actions reads commit messages to decide the next version.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Version Bump Rules

| Commit Prefix | Example | Bump |
| ------------- | ------- | ---- |
| `fix:` | `fix: tooltip alignment on card page` | Patch (1.0.0 → 1.0.1) |
| `feat:` | `feat: add transaction history view` | Minor (1.0.0 → 1.1.0) |
| `feat!:` or `BREAKING CHANGE` in footer | `feat!: redesign inventory API` | Major (1.0.0 → 2.0.0) |

Other prefixes like `docs:`, `chore:`, `refactor:`, `test:`, `style:`, and `ci:` are valid and will default to a **patch** bump.

### Tips

- Use the type that best describes the change — `feat` for new functionality, `fix` for bug fixes
- Scope is optional but useful: `feat(transactions): add FIFO cost basis`
- If a PR has multiple commits, the highest bump wins (e.g., one `feat:` + several `fix:` = minor bump)
- The version in `package.json` is the baseline — CI computes the next version from there

## Build & Deploy

### Production (Web)

Deploys automatically via GitHub Actions on push to `main`. See `.github/workflows/deploy.yml`.

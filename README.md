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

#### Run ETL Process to Get All Data

`docker compose run --rm etl cargo run -- ingest`

#### Run ETL Process One-time Cleanup For Everything

`docker compose run --rm etl cargo run -- cleanup -c`

#### Run Tests

```Docker
docker compose exec web npm test
docker compose exec etl cargo test
```

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

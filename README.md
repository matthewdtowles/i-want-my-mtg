# I Want My MTG

## Overview

"I Want My MTG" is a project for managing and viewing Magic: The Gathering collections. This project uses NestJS, TypeORM, and other modern web technologies.

## Development Workflow

### Initial Setup

#### Copy Env File

`cp .env.example. .env`

- Add values to new `.env` file

#### Start Dev Env

`docker compose up -d`

#### View Logs

`docker compose logs -f web`

### Example Dev Workflow

#### Start Web App + Database

`docker compose up web postgres`

#### Run ETL Process to Get All Data

`docker compose run --rm etl cargo run -- ingest`

#### Run Tests

```Docker
docker compose exec web npm test
docker compose exec etl cargo test
```

#### Check Database

`docker compose exec postgres psql -U postgres -d i_want_my_mtg`

#### Rebuild (For Dependency Changes)

```Docker
docker compose build web
docker compose up -d web
```

### Database Management

#### Run Migrations

`docker compose exec web npm run migration:run`

#### Seed Database

`docker compose exec web npm run seed`

#### Database Backup

`docker compose exec postgres pg_dump -U postgres i_want_my_mtg > backup.sql`

#### Reset Database

```Docker
docker compose down -v
docker compose up -d postgres
```

## Example Dev Workflow 2

### Daily development

#### Start everything

`docker compose up -d`

#### Watch web app logs

`docker compose logs -f web`

#### Run ETL

`docker compose run --rm etl cargo run -- ingest`

### Database operations

`docker compose exec postgres psql -U -d i_want_my_mtg`

### Debugging

#### Restart Web App

`docker compose restart web`

#### Rebuild after package.json Change

`docker compose build web`

#### Nuclear option - fresh start

`docker compose down -v`

### Cleanup

#### Stop Everything

`docker compose down`

#### Clean up unused containers/images

`docker system prune`

## Command Cheat Sheet

### Development

#### Start Everything

`docker compose up`

#### Start Web App

`docker compose up web postgres`

#### Run ETL (Dev)

`docker compose run --rm etl`

#### View Logs for Web

`docker compose logs -f web`

#### Execute Commands

```Docker
docker compose exec web npm run migration:run
docker compose exec postgres psql -U postgres -d i_want_my_mtg
```

#### Execute Migrations

```Docker
docker compose run --rm migrate
```

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

## Getting Started Checklist

- [ ] Clone repository
- [ ] Copy .env.example to .env
- [ ] Run docker compose up
- [ ] Visit localhost:3000 (web app)
- [ ] Visit localhost:8080 (database admin)
- [ ] Make code changes and see hot reload
- [ ] Run ETL: docker compose run --rm etl
- [ ] Commit changes to trigger CI/CD
- [ ] Deploy to production server

# I Want My MTG

## Overview

"I Want My MTG" is a project for managing and viewing Magic: The Gathering collections. This project uses NestJS, TypeORM, and other modern web technologies.

## Development Workflow

### Initial Setup

#### Copy Env File
`cp .env.example. .env`
- Add values to new `.env` file

#### Start Dev Env
`docker-compose up -d`

#### View Logs
`docker-compose logs -f web`

### Development Workflow

#### Start Web App + Database
`docker-compose up web postgres`

#### Run ETL Process
`docker-compose run --rm etl`

#### Run Tests
```
docker-compose exec web npm test
docker-compose exec etl cargo test
```

#### Check Database
`docker-compose exec postgres psql -U postgres -d i_want_my_mtg`

#### Rebuild (For Dependency Changes)
```
docker-compose build web
docker-compose up -d web
```

### Database Management

#### Run Migrations
`docker-compose exec web npm run migration:run`

#### Seed Database
`docker-compose exec web npm run seed`

#### Database Backup
`docker-compose exec postgres pg_dump -U postgres i_want_my_mtg > backup.sql`

#### Reset Database
```
docker-compose down -v
docker-compose up -d postgres
```

## Command Cheat Sheet

### Development

#### Start Everything
`docker-compose up`

#### Start Web App
`docker-compose up web postgres`

#### Run ETL
`docker-compose run --rm etl`

#### View Logs
`docker-compose logs -f web`

#### Execute Commands
```
docker-compose exec web npm run migration:run
docker-compose exec postgres psql -U postgres -d i_want_my_mtg
```

#### Clean Up
```
docker-compose down -v
docker system prune -a
```

### Production

#### Deploy (if using script)
`./deploy.sh`

#### Check Status
`docker-compose -f docker-compose.prod.yml ps`

#### View Logs
`docker-compose -f docker-compose.prod.yml logs web`

#### Run ETL Manually
`docker-compose -f docker-compose.prod.yml run --rm etl`

#### Update Single Service
```
docker-compose -f docker-compose.prod.yml pull web
docker-compose -f docker-compose.prod.yml up -d web
```

## Getting Started Checklist 

- [ ] Clone repository
- [ ] Copy .env.example to .env
- [ ] Run docker-compose up
- [ ] Visit http://localhost:3000 (web app)
- [ ] Visit http://localhost:8080 (database admin)
- [ ] Make code changes and see hot reload
- [ ] Run ETL: docker-compose run --rm etl
- [ ] Commit changes to trigger CI/CD
- [ ] Deploy to production server

[iwantmymtg.net](https://iwantmymtg.net)
# I Want My MTG

## Overview

"I Want My MTG" is a project for managing and viewing Magic: The Gathering collections. This project uses NestJS, TypeORM, and other modern web technologies.

## Prerequisites

- Node.js (>= 14.x)
- npm (>= 6.x)
- PostgresQL (>= 8.x)

## Getting Started

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory and add the following environment variables:

```env
# Database configuration
APP_NAME=i-want-my-mtg
DB_HOST=<your-value-here>
DB_PORT=<your-value-here>
DB_USERNAME=<your-value-here>
DB_PASSWORD=<your-value-here>
DB_NAME=<your-value-here>

# JWT configuration
JWT_SECRET=<your-value-here>


### Database Setup

Make sure you have PostgresQL running and create a database named `i_want_my_mtg`. Then, run the following command to synchronize the database schema:

```bash
npm run typeorm schema:sync
```

### Running the Project

To start the project in development mode, run:

```bash
npm run start:dev
```

The project will be running at `http://localhost:5432`.

### Running Tests

To run the tests, use the following command:

```bash
npm run test
```

To run tests with coverage, use:

```bash
npm run test:cov
```

### Project Structure

- `src/`: The main source code directory.
  - `http/`: Contains the HTTP adapter.
  - `core/`: Contains the core business logic and domain models.
  - `modules/`: Contains the NestJS modules.
- `test/`: Contains the test files.

### Scripts

- `npm run start`: Start the project in production mode.
- `npm run start:dev`: Start the project in development mode.
- `npm run test`: Run the tests.
- `npm run test:cov`: Run the tests with coverage.
- `npm run lint`: Run the linter.
- `npm run build`: Build the project.
- See `package.json` for all other scripts


# Future Considerations

## Notes on TypeORM Migrations:

### Dir Struct
src/migrations/0001_initial.ts (each file can be gen'd by type orm)
src/ormconfig.ts

### ormconfig.ts example
```TypeScript
import {TypeOrmModule} from '@nestjs/typeorm';
import { User } from './entities/User';

export default {
  type: 'postgresql',
  database: ':memory:',
  entities: [User],
  migrations: [__dirname + '/migrations/*.ts'],
  migrationsRun: true, // set to false for manual migration execution
  synchronize: false, // set to false for migrations to work
};
export const TypeOrmConfig = TypeOrmModule.forRoot(ormconfig);
```

### Generate new migration file
`npx typeorm migration:create <migration_name>`

### Run Migrations
`npx typeorm migration:run`

#

[iwantmymtg.net](https://iwantmymtg.net)
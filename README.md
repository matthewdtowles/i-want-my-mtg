## TODO List
- front end to figure out what pieces of api data to use
  - this will drive schema design
- schema design
- implement db schema
- module to fetch from api
- module to fetch from db
- module to fetch and abstract datasource
  - use db, if miss then api and write to db
  - needs mapper from api data/models to db

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```




# Notes on TypeORM Migrations:

## Create OneToOne relationship
```TypeScript
@Entity
export class Card {
  @OneToOne(() => CardMetadata, (metadata) => mmetadata.card, {
    cascade: true, // makes metadata entry get saved as well
  })
  metadata: CardMetadata;
}
```

## One to Many & Many to One
```TypeScript
@Entity
export class Artist {
  @PrimaryGeneratedColumn()
  id: number;

  // other cols...

  @OneToMany(() => Card, (card) => card.artist);
  cards: Card[]; 
}

@Entity
export class Card {
  // other cols...
  @ManyToOne(() => Artist, (artist) => artist.cards)
  artist: Artist;
}
// which one owns relationship? 
// should be each card has an artist
```

## ManyTOMany
- `Set` owns `Card` and each Set has many cards. Each atomic card can be in many sets.
```TypeScript
@Entity
export class Set {
  @ManyToMany(()=> Card, (card) => card.sets)
  @JoinTable() // since Set owns Card
  cards: Card[]
}

@Entity
export class Card {
  @ManyToMany(() => Set, (set) => set.cards)
  sets: Set[];
}
// ORM creates junction table in background: set_cards_card_sets
```

## Dir Struct
src/entities/Card.ts, Set.ts, etc...
src/migrations/0001_initial.ts (each file can be gen'd by type orm)
src/ormconfig.ts

## ormconfig.ts example
```TypeScript
import {TypeOrmModule} from "@nestjs/typeorm";
import { User } from "./entities/User";

export default {
  type: "mysql",
  database: ":memory:",
  entities: [User],
  migrations: [__dirname + "/migrations/*.ts"],
  migrationsRun: true, // set to false for manual migration execution
  synchronize: false, // set to false for migrations to work
};
export const TypeOrmConfig = TypeOrmModule.forRoot(ormconfig);
```

## Generate new migration file
`npx typeorm migration:create <migration_name>`

## Run Migrations
`npx typeorm migration:run`

  
_See TypeOrm docs for details on query builder, example queries, and more_ 

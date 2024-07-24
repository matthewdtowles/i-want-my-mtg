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
## New Module Creation
```bash
$ nest g resource <resourceName>
```
- Creates dto/, entities/, controller, module, and service 
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
import {TypeOrmModule} from '@nestjs/typeorm';
import { User } from './entities/User';

export default {
  type: 'mysql',
  database: ':memory:',
  entities: [User],
  migrations: [__dirname + '/migrations/*.ts'],
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


# Features

## MVP Pages
- Home/index
  - Likely one of the other pages below
- List of Sets
- Page with Set products/cards
- User hub page
- Settings as a sub of User page 
- 'My Collection' page as a sub of User page
- Reset password page as sub of User page?

## Set List Page

### Description/Todo
- List sets in grouping and in chronological order with links to set page
- Use as homepage ?
  - Can be first version of home page
- CSS/Style and formatting
- Refactor: What module does this belong to?
- Identify db entities/models used and request models used
- Save results list of all sets into db
- Service should check DB for list of sets and render that 
  - Call out to mtgjson if not there
- Design decision: How to logically group sets in display
- Obtain set symbol images and display
  - Design decision: obtain via api if not present in assets?
    - Obtain via api and then save to assets
      - Asset manager or something like this?

## Set Page - Cards

### Description/Todo
- What is the set model for the DB
- CSS/Style and formatting
- Refactor?: Module/entities/dto all good?
- DB entities
- Save results list of all cards into db
- Service check DB for cards before hitting mtgjson rest api
- List of cards in the set
- Has input field/box showing number of cards owned by user for that set
  - Accepts integer as input
    - Design decision: Update async or user submit in bulk?
- Get card templates and display
- Popup for each individual card (different template)

## Single Card Page

### Description/Todo
- Page for a single card with info about that card
- All other sets that card is in with links to those pages

#### Single Card Page Attributes
- Card.
  - name
  - set
  - @MANYTOMANY? other printings/sets
  - mana cost
  - (oracle) text
  - legality
  - price

## User Page

### Description/Todo
- Displays user's information
- Design decision: Settings as a sub-page?
- User page as hub for all user-centric info other than a set page

## Other Todo/Notes:
- Use CardSet from MTGJSON 
  - Do NOT use CardAtomic
- Get all sets/cards from AllPrintings.json?
- Compare mtgjson sql files with design
- How to get images:
  - `set.identity[]`: has all URLs 
    - i.e.: `set.cards[i].identity.scryfallId` to get img 
  - `keyRuneCode` for set symbols
- _See [mtgjson.com/data-models](https://mtgjson.com/data-models) for more info_


# Front End

## Styles

### Mana Cost
- Ref: https://mana.andrewgioia.com/
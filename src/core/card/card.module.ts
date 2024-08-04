import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { DatabaseModule } from 'src/database/database.module';
import { CardServicePort } from './ports/card.service.port';
import { CardRepositoryPort } from './ports/card.repository.port';
import { CardDataIngestionPort } from './ports/card-data.ingestion.port';

@Module({
    // TODO: A vs B (below)
    imports: [DatabaseModule],
    providers: [
        {
            provide: CardServicePort,
            useClass: CardService,
        },
    ],
    exports: [
        CardDataIngestionPort, 
        CardRepositoryPort, 
        CardServicePort,
    ]
})
export class CardModule {}

// TODO: evaluate A vs B
/*
// A: WITHOUT a CORE MODULE to wire it up
@Module({
  imports: [DatabaseModule],
  controllers: [CollectionController],
  providers: [
    {
      provide: ICollectionServicePort,
      useClass: CollectionService,
    },
  ],
  exports: [ICollectionServicePort],
})
export class CollectionModule {}
*/

/*
// B: WITH CORE MODULE to wire up
@Module({
  controllers: [CollectionController],
  providers: [
    {
      provide: ICollectionServicePort,
      useClass: CollectionService,
    },
  ],
  exports: [ICollectionServicePort, ICollectionRepositoryPort],
})
export class CollectionModule {}
///////////////////////////////////////////////

// src/core/core.module.ts
@Module({
  imports: [CollectionModule, DatabaseModule],
  providers: [
    {
      provide: CollectionServicePort,
      useClass: CollectionService,
    },
    // No need to provide ICollectionRepositoryPort here as it is provided and exported by DatabaseModule
  ],
  exports: [CollectionServicePort, CollectionRepositoryPort],
})
export class CoreModule {}




*/


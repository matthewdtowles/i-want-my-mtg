import { Global, Module } from '@nestjs/common';
import { CardService } from 'src/card/card.service';
import { CollectionService } from 'src/collection/collection.service';
import { DataIngestionService } from 'src/data-ingestion/data-ingestion.service';
import { SetService } from 'src/set/set.service';
import { UserService } from 'src/users/user.service';

@Global()
@Module({
  providers: [
    {
      provide: 'ICardService',
      useClass: CardService
    },
    {
      provide: 'ICollectionService',
      useClass: CollectionService
    },
    {
      provide: 'IDataIngestionService',
      useClass: DataIngestionService
    },
    {
      provide: 'ISetService',
      useClass: SetService
    },
    {
      provide: 'IUserService',
      useClass: UserService
    },
  ],
  exports: [
    'ICardService',
    'ICollectionService',
    'IDataIngestionService',
    'ISetService',
    'IUsersService',
  ],
})
export class ApiModule {}

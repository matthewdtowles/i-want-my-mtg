import { Logger, Module } from '@nestjs/common';
import { CardModule } from './card/card.module';
import { CollectionModule } from './collection/collection.module';
import { SetModule } from './set/set.module';
import { UserModule } from './user/user.module';
import { IngestionModule } from './ingestion/ingestion.module';

@Module({
    imports: [
        CardModule,
        CollectionModule,
        SetModule,  
        UserModule,
        IngestionModule,
    ],
    exports: [
        CardModule,
        CollectionModule,
        SetModule,
        UserModule,
        IngestionModule,
    ]
})
export class CoreModule {
    private readonly LOGGER: Logger = new Logger(CoreModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
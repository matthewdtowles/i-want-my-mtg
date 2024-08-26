import { Logger, Module } from '@nestjs/common';
import { CollectionRepository } from 'src/adapters/database/collection.repository';
import { DatabaseModule } from 'src/adapters/database/database.module';
import { CollectionService } from './collection.service';
import { CollectionRepositoryPort } from './ports/collection.repository.port';
import { CollectionServicePort } from './ports/collection.service.port';

@Module({
    imports: [DatabaseModule],
    providers: [
        {
            provide: CollectionServicePort,
            useClass: CollectionService,
        },
        {
            provide: CollectionRepositoryPort,
            useClass: CollectionRepository,
        },
    ],
    exports: [
        CollectionServicePort,
    ]
})
export class CollectionModule {
    private readonly LOGGER: Logger = new Logger(CollectionModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
import { Module } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CollectionServicePort } from './ports/collection.service.port';
import { CollectionRepositoryPort } from './ports/collection.repository.port';
import { CollectionRepository } from 'src/adapters/database/collection.repository';
import { DatabaseModule } from 'src/adapters/database/database.module';

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
        CollectionRepositoryPort,
        CollectionServicePort,
    ]
})
export class CollectionModule { }
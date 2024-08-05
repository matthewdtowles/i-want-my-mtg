import { Module } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { CollectionServicePort } from './ports/collection.service.port';
import { CollectionRepositoryPort } from './ports/collection.repository.port';

@Module({
    providers: [
        {
            provide: CollectionServicePort,
            useClass: CollectionService,
        },
    ],
    exports: [
        CollectionRepositoryPort,
        CollectionServicePort,
    ]
})
export class CollectionModule { }
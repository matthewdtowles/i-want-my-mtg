import { Module } from '@nestjs/common';
import { CollectionService } from './collection.service';

@Module({
    providers: [
        CollectionService,
        {
            provide: 'CollectionRepositoryPort',
            useClass: CollectionService,
        },
    ],
    exports: ['CollectionServicePort']
})
export class CollectionModule { }
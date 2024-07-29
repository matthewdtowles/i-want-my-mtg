import { Module } from '@nestjs/common';
import { CollectionService } from './collection.service';

@Module({
    providers: [
        {
            provide: 'CollectionServicePort',
            useClass: CollectionService,
        },
    ],
    exports: ['CollectionServicePort']
})
export class CollectionModule { }
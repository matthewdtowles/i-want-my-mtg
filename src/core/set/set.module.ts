import { Module } from '@nestjs/common';
import { SetService } from './set.service';

@Module({
    imports: [],
    providers: [
        {
            provide: 'SetServicePort',
            useClass: SetService,
        },
    ],
    exports: ['SetServicePort'],
})
export class SetModule {}

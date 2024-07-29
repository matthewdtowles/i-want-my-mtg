import { Module } from '@nestjs/common';
import { CardService } from './card.service';

@Module({
    providers: [
        {
            provide: 'CardServicePort',
            useClass: CardService,
        },
    ],
    exports: ['CardServicePort']
})
export class CardModule {}

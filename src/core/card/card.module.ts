import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardServicePort } from './ports/card.service.port';
import { CardRepositoryPort } from './ports/card.repository.port';
import { CardDataIngestionPort } from './ports/card-data.ingestion.port';

@Module({
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
export class CardModule { }
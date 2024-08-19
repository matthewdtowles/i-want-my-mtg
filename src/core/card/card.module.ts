import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardServicePort } from './ports/card.service.port';
import { CardRepositoryPort } from './ports/card.repository.port';
import { IngestionServicePort } from '../ingestion/ingestion.service.port'
import { MtgJsonIngestionService } from 'src/adapters/mtgjson-ingestion/mtgjson-ingestion.service';
import { CardRepository } from 'src/adapters/database/card.repository';
import { MtgJsonIngestionModule } from 'src/adapters/mtgjson-ingestion/mtgjson-ingestion.module';
import { DatabaseModule } from 'src/adapters/database/database.module';

@Module({
    imports: [
        DatabaseModule,
        MtgJsonIngestionModule,
    ],
    providers: [
        {
            provide: CardServicePort,
            useClass: CardService,
        },
        {
            provide: IngestionServicePort,
            useClass: MtgJsonIngestionService,
        },
        {
            provide: CardRepositoryPort,    
            useClass: CardRepository,
        },
    ],
    exports: [
        IngestionServicePort,
        CardRepositoryPort,
        CardServicePort,
    ]
})
export class CardModule { 
    constructor() {
        console.log('* * CardModule Initialized * *');
    }
}
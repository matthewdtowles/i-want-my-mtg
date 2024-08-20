import { Module } from '@nestjs/common';
import { CardRepository } from 'src/adapters/database/card.repository';
import { DatabaseModule } from 'src/adapters/database/database.module';
import { MtgJsonIngestionModule } from 'src/adapters/mtgjson-ingestion/mtgjson-ingestion.module';
import { MtgJsonIngestionService } from 'src/adapters/mtgjson-ingestion/mtgjson-ingestion.service';
import { IngestionServicePort } from '../ingestion/ingestion.service.port';
import { CardService } from './card.service';
import { CardRepositoryPort } from './ports/card.repository.port';
import { CardServicePort } from './ports/card.service.port';

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
        // MtgJsonApiClient
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
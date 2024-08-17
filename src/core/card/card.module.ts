import { Module } from '@nestjs/common';
import { CardService } from './card.service';
import { CardServicePort } from './ports/card.service.port';
import { CardRepositoryPort } from './ports/card.repository.port';
import { CardDataIngestionPort } from './ports/card-data.ingestion.port';
import { MtgJsonIngestionService } from 'src/mtgjson-ingestion/mtgjson-ingestion.service';
import { CardRepository } from 'src/database/card/card.repository';
import { MtgJsonIngestionModule } from 'src/mtgjson-ingestion/mtgjson-ingestion.module';
import { DatabaseModule } from 'src/database/database.module';

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
            provide: CardDataIngestionPort,
            useClass: MtgJsonIngestionService,
        },
        {
            provide: CardRepositoryPort,    
            useClass: CardRepository,
        },
    ],
    exports: [
        CardDataIngestionPort,
        CardRepositoryPort,
        CardServicePort,
    ]
})
export class CardModule { 
    constructor() {
        console.log('* * CardModule Initialized * *');
    }
}
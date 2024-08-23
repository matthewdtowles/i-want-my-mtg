import { Module } from '@nestjs/common';
import { CardRepository } from 'src/adapters/database/card.repository';
import { DatabaseModule } from 'src/adapters/database/database.module';
import { MtgJsonIngestionModule } from 'src/adapters/mtgjson-ingestion/mtgjson-ingestion.module';
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
            provide: CardRepositoryPort,    
            useClass: CardRepository,
        },
    ],
    exports: [
        CardServicePort,
    ]
})
export class CardModule { 
    constructor() {
        console.log('* * CardModule Initialized * *');
    }
}

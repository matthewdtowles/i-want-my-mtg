import { Module } from '@nestjs/common';
import { SetService } from './set.service';
import { SetServicePort } from './ports/set.service.port';
import { SetRepositoryPort } from './ports/set.repository.port';
import { IngestionServicePort } from '../ingestion/ingestion.service.port';
import { DatabaseModule } from 'src/adapters/database/database.module';
import { MtgJsonIngestionModule } from 'src/adapters/mtgjson-ingestion/mtgjson-ingestion.module';
import { SetRepository } from 'src//adapters/database/set.repository';
import { MtgJsonIngestionService } from 'src/adapters/mtgjson-ingestion/mtgjson-ingestion.service';
import { SetMapper } from 'src/core/set/set.mapper';
import { CardMapper } from '../card/card.mapper';

@Module({
    imports: [
        DatabaseModule,
        MtgJsonIngestionModule,
    ],
    providers: [
        SetMapper,
        CardMapper,
        {
            provide: SetServicePort,
            useClass: SetService,
        },
        {
            provide: IngestionServicePort,
            useClass: MtgJsonIngestionService,
        },
        {
            provide: SetRepositoryPort,    
            useClass: SetRepository,
        }
    ],
    exports: [
        IngestionServicePort,
        SetRepositoryPort,
        SetServicePort,
        SetMapper,
        CardMapper,
    ]
})
export class SetModule { }
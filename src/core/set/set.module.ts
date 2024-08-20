import { Module } from '@nestjs/common';
import { SetRepository } from 'src//adapters/database/set.repository';
import { DatabaseModule } from 'src/adapters/database/database.module';
import { MtgJsonIngestionModule } from 'src/adapters/mtgjson-ingestion/mtgjson-ingestion.module';
import { MtgJsonIngestionService } from 'src/adapters/mtgjson-ingestion/mtgjson-ingestion.service';
import { IngestionServicePort } from '../ingestion/ingestion.service.port';
import { SetRepositoryPort } from './ports/set.repository.port';
import { SetServicePort } from './ports/set.service.port';
import { SetService } from './set.service';

@Module({
    imports: [
        DatabaseModule,
        MtgJsonIngestionModule,
    ],
    providers: [
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
        },
    ],
    exports: [
        IngestionServicePort,
        SetRepositoryPort,
        SetServicePort,
    ]
})
export class SetModule { }
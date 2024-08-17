import { Module } from '@nestjs/common';
import { SetService } from './set.service';
import { SetServicePort } from './ports/set.service.port';
import { SetRepositoryPort } from './ports/set.repository.port';
import { SetDataIngestionPort } from './ports/set-data.ingestion.port';
import { DatabaseModule } from 'src/database/database.module';
import { MtgJsonIngestionModule } from 'src/mtgjson-ingestion/mtgjson-ingestion.module';
import { SetRepository } from 'src/database/set/set.repository';
import { MtgJsonIngestionService } from 'src/mtgjson-ingestion/mtgjson-ingestion.service';
import { SetMapper } from 'src/http/set/set.mapper';
import { CardMapper } from 'src/http/card/card.mapper';

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
            provide: SetDataIngestionPort,
            useClass: MtgJsonIngestionService,
        },
        {
            provide: SetRepositoryPort,    
            useClass: SetRepository,
        }
    ],
    exports: [
        SetDataIngestionPort,
        SetRepositoryPort,
        SetServicePort,
        SetMapper,
        CardMapper,
    ]
})
export class SetModule { }
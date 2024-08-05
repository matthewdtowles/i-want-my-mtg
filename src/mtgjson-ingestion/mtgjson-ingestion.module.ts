import { Module } from '@nestjs/common';
import { MtgJsonIngestionService } from './mtgjson-ingestion.service';
import { MtgJsonMapperService } from './mtgjson-mapper.service';
import { CardDataIngestionPort } from 'src/core/card/ports/card-data.ingestion.port';
import { SetDataIngestionPort } from 'src/core/set/ports/set-data.ingestion.port';

@Module({
    providers: [
        {
            provide: CardDataIngestionPort,
            useClass: MtgJsonIngestionService,
        },
        {
            provide: SetDataIngestionPort,
            useClass: MtgJsonIngestionService,
        },
        MtgJsonMapperService,
    ],
    exports: [
        CardDataIngestionPort,
        SetDataIngestionPort,
    ]
})
export class MtgJsonIngestionModule { }

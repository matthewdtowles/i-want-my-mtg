import { Module } from '@nestjs/common';
import { MtgJsonIngestionService } from './mtgjson-ingestion.service';
import { MtgJsonMapperService } from './mtgjson-mapper.service';
import { CardDataIngestionPort } from 'src/core/card/ports/card-data.ingestion.port';
import { SetDataIngestionPort } from 'src/core/set/ports/set-data.ingestion.port';

@Module({
    providers: [
        MtgJsonMapperService,
        {
            provide: CardDataIngestionPort,
            useClass: MtgJsonIngestionService,
        },
        {
            provide: SetDataIngestionPort,
            useClass: MtgJsonIngestionService,
        },
    ],
    exports: [
        CardDataIngestionPort,
        SetDataIngestionPort,
        MtgJsonMapperService,
    ]
})
export class MtgJsonIngestionModule { 
    constructor() {
        console.log('* * MtgJsonIngestionModule Initialized * *');
    }
}

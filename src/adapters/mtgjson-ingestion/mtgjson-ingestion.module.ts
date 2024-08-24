import { Module } from '@nestjs/common';
import { MtgJsonIngestionService } from './mtgjson-ingestion.service';
import { MtgJsonMapperService } from './mtgjson-mapper.service';
import { IngestionServicePort } from 'src/core/ingestion/ingestion.service.port';
import { MtgJsonApiClient } from './mtgjson-api.client';

@Module({
    providers: [
        MtgJsonApiClient,
        MtgJsonMapperService,
        {
            provide: IngestionServicePort,
            useClass: MtgJsonIngestionService,
        },
    ],
    exports: [
        IngestionServicePort,
    ]
})
export class MtgJsonIngestionModule { 
    constructor() {
        console.log('* * MtgJsonIngestionModule Initialized * *');
    }
}
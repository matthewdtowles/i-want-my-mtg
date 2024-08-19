import { Module } from '@nestjs/common';
import { IngestionOrchestrator } from './ingestion.orchestrator';
import { IngestionServicePort } from './ingestion.service.port';
import { MtgJsonIngestionService } from 'src/adapters/mtgjson-ingestion/mtgjson-ingestion.service';

@Module({
    providers: [
        IngestionOrchestrator,
        {
            provide: IngestionServicePort,
            useClass: MtgJsonIngestionService,
        },
    ],
    exports: [IngestionOrchestrator],
})
export class IngestionModule {}

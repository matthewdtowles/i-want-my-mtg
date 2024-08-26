import { Logger, Module } from '@nestjs/common';
import { MtgJsonIngestionService } from 'src/adapters/mtgjson-ingestion/mtgjson-ingestion.service';
import { CardModule } from 'src/core/card/card.module';
import { IngestionOrchestrator } from 'src/core/ingestion/ingestion.orchestrator';
import { IngestionServicePort } from 'src/core/ingestion/ingestion.service.port';
import { SetModule } from 'src/core/set/set.module';
import { IngestionCli } from './ingestion.cli';
import { MtgJsonIngestionModule } from 'src/adapters/mtgjson-ingestion/mtgjson-ingestion.module';

@Module({
    imports: [
        MtgJsonIngestionModule,
        SetModule,
        CardModule,
    ],
    providers: [
        IngestionOrchestrator,
        IngestionCli,
        {
            provide: IngestionServicePort,
            useClass: MtgJsonIngestionService,
        },
    ],
    exports: [
        IngestionOrchestrator,
        IngestionServicePort,
    ]
})
export class IngestionCliModule {
    private readonly LOGGER: Logger = new Logger(IngestionCliModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
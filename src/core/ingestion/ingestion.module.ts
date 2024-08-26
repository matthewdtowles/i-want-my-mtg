import { Logger, Module } from '@nestjs/common';
import { IngestionOrchestrator } from './ingestion.orchestrator';
import { IngestionServicePort } from './ingestion.service.port';
import { MtgJsonIngestionService } from 'src/adapters/mtgjson-ingestion/mtgjson-ingestion.service';
import { MtgJsonIngestionModule } from 'src/adapters/mtgjson-ingestion/mtgjson-ingestion.module';
import { CardModule } from '../card/card.module';
import { SetModule } from '../set/set.module';
import { SetServicePort } from '../set/ports/set.service.port';
import { SetService } from '../set/set.service';
import { CardServicePort } from '../card/ports/card.service.port';
import { CardService } from '../card/card.service';

@Module({
    imports: [
        MtgJsonIngestionModule,
        CardModule,
        SetModule,
    ],
    providers: [
        IngestionOrchestrator,
        {
            provide: IngestionServicePort,
            useClass: MtgJsonIngestionService,
        },
        {
            provide: CardServicePort,
            useClass: CardService,
        },
        {
            provide: SetServicePort,
            useClass: SetService,
        },
    ],
    exports: [IngestionOrchestrator],
})
export class IngestionModule {
    private readonly LOGGER: Logger = new Logger(IngestionModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

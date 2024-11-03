import { Logger, Module } from "@nestjs/common";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";
import { MtgJsonIngestionService } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.service";
import { CardModule } from "../card/card.module";
import { SetModule } from "../set/set.module";
import { IngestionOrchestrator } from "./ingestion.orchestrator";
import { IngestionOrchestratorPort } from "./api/ingestion.orchestrator.port";
import { IngestionServicePort } from "./api/ingestion.service.port";

@Module({
    imports: [MtgJsonIngestionModule, CardModule, SetModule],
    providers: [
        {
            provide: IngestionOrchestratorPort,
            useClass: IngestionOrchestrator,
        },
        {
            provide: IngestionServicePort,
            useClass: MtgJsonIngestionService,
        },
    ],
    exports: [IngestionOrchestratorPort],
})
export class IngestionModule {
    private readonly LOGGER: Logger = new Logger(IngestionModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

import { Logger, Module } from "@nestjs/common";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";
import { MtgJsonIngestionService } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.service";
import { PriceServicePort } from "src/core/price/api/price.service.port";
import { PriceModule } from "src/core/price/price.module";
import { PriceService } from "src/core/price/price.service";
import { CardModule } from "../card/card.module";
import { SetModule } from "../set/set.module";
import { IngestionOrchestratorPort } from "./api/ingestion.orchestrator.port";
import { IngestionServicePort } from "./api/ingestion.service.port";
import { IngestionOrchestrator } from "./ingestion.orchestrator";

@Module({
    imports: [MtgJsonIngestionModule, CardModule, PriceModule, SetModule],
    providers: [
        { provide: IngestionOrchestratorPort, useClass: IngestionOrchestrator },
        { provide: IngestionServicePort, useClass: MtgJsonIngestionService },
        { provide: PriceServicePort, useClass: PriceService },
    ],
    exports: [IngestionOrchestratorPort],
})
export class IngestionModule {
    private readonly LOGGER: Logger = new Logger(IngestionModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

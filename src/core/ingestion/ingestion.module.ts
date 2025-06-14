import { Logger, Module } from "@nestjs/common";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";
import { CardModule } from "src/core/card/card.module";
import { IngestionOrchestrator } from "src/core/ingestion/ingestion.orchestrator";
import { PriceModule } from "src/core/price/price.module";
import { SetModule } from "src/core/set/set.module";

@Module({
    imports: [CardModule, PriceModule, SetModule, MtgJsonIngestionModule],
    providers: [IngestionOrchestrator],
    exports: [IngestionOrchestrator],
})
export class IngestionModule {
    private readonly LOGGER: Logger = new Logger(IngestionModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

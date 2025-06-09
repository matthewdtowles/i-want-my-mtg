import { Logger, Module } from "@nestjs/common";
import { CardModule } from "src/core/card";
import { IngestionOrchestrator, IngestionServicePort } from "src/core/ingestion";
import { PriceModule, PriceService } from "src/core/price";
import { SetModule } from "src/core/set";

@Module({
    imports: [CardModule, PriceModule, SetModule],
    providers: [
        IngestionOrchestrator,
        PriceService,
    ],
    exports: [IngestionOrchestrator, IngestionServicePort],
})
export class IngestionModule {
    private readonly LOGGER: Logger = new Logger(IngestionModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

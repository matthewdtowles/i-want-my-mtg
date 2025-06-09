import { Logger, Module } from "@nestjs/common";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";
import { CardModule } from "src/core/card";
import { IngestionOrchestrator } from "src/core/ingestion";
import { PriceModule, PriceService } from "src/core/price";
import { SetModule } from "src/core/set";

@Module({
    imports: [MtgJsonIngestionModule, CardModule, PriceModule, SetModule],
    providers: [
        IngestionOrchestrator,
        PriceService,
    ],
    exports: [IngestionOrchestrator],
})
export class IngestionModule {
    private readonly LOGGER: Logger = new Logger(IngestionModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

import { Logger, Module } from "@nestjs/common";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";
import { MtgJsonIngestionService } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.service";
import { CardModule } from "src/core/card";
import { IngestionModule, IngestionServicePort } from "src/core/ingestion";
import { PriceModule } from "src/core/price";
import { SetModule } from "src/core/set";
import { IngestionCli } from "./ingestion.cli";

@Module({
    imports: [
        CardModule,
        IngestionModule,
        MtgJsonIngestionModule,
        PriceModule,
        SetModule,
    ],
    providers: [
        IngestionCli,
        {
            provide: IngestionServicePort,
            useClass: MtgJsonIngestionService,
        },
    ],
    exports: [IngestionCli],
})
export class IngestionCliModule {
    private readonly LOGGER: Logger = new Logger(IngestionCliModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

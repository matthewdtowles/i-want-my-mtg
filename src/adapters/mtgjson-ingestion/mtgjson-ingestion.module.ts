import { Logger, Module } from "@nestjs/common";
import { IngestionServicePort } from "src/core/ingestion/ingestion.service.port";
import { MtgJsonApiClient } from "./mtgjson-api.client";
import { MtgJsonIngestionMapper } from "./mtgjson-ingestion.mapper";
import { MtgJsonIngestionService } from "./mtgjson-ingestion.service";

@Module({
    providers: [
        MtgJsonApiClient,
        MtgJsonIngestionMapper,
        { provide: IngestionServicePort, useClass: MtgJsonIngestionService },
    ],
    exports: [IngestionServicePort],
})
export class MtgJsonIngestionModule {
    private readonly LOGGER: Logger = new Logger(MtgJsonIngestionModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

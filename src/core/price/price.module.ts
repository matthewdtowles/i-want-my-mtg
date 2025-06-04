import { Logger, Module } from "@nestjs/common";
import { DatabaseModule } from "src/adapters/database/database.module";
import { PriceRepository } from "src/adapters/database/price.repository";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";
import { CardModule } from "src/core/card/card.module";
import { PriceRepositoryPort } from "./api/price.repository.port";
import { PriceServicePort } from "./api/price.service.port";
import { PriceService } from "./price.service";

@Module({
    imports: [DatabaseModule, MtgJsonIngestionModule, CardModule],
    providers: [
        { provide: PriceServicePort, useClass: PriceService },
        { provide: PriceRepositoryPort, useClass: PriceRepository },
    ],
    exports: [PriceServicePort, PriceRepositoryPort],
})
export class PriceModule {
    private readonly LOGGER = new Logger(PriceModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
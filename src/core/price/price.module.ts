import { Logger, Module } from "@nestjs/common";
import { DatabaseModule } from "src/adapters/database/database.module";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";
import { PriceRepository } from "src/adapters/database/price.repository";
import { PriceRepositoryPort } from "./api/price.repository.port";
import { PriceService } from "./price.service";
import { PriceServicePort } from "./api/price.service.port";
import { PriceMapper } from "./price.mapper";

@Module({
    imports: [DatabaseModule, MtgJsonIngestionModule],
    providers: [
        { provide: PriceServicePort, useClass: PriceService },
        { provide: PriceRepositoryPort, useClass: PriceRepository },
        PriceMapper,
    ],
    exports: [PriceServicePort, PriceRepositoryPort, PriceMapper],
})
export class PriceModule {
    private readonly LOGGER = new Logger(PriceModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
import { Logger, Module } from "@nestjs/common";
import { CardModule } from "src/core/card";
import { PriceRepositoryPort, PriceService } from "src/core/price";

@Module({
    imports: [CardModule],
    providers: [PriceService],
    exports: [PriceService, PriceRepositoryPort],
})
export class PriceModule {
    private readonly LOGGER = new Logger(PriceModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
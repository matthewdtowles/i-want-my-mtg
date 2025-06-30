import { Logger, Module } from "@nestjs/common";
import { CardModule } from "src/core/card/card.module";
import { PriceService } from "src/core/price/price.service";
import { DatabaseModule } from "src/infrastructure/database/database.module";

@Module({
    imports: [DatabaseModule, CardModule],
    providers: [PriceService],
    exports: [PriceService],
})
export class PriceModule {
    private readonly LOGGER = new Logger(PriceModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
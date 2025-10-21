import { Logger, Module } from "@nestjs/common";
import { CardModule } from "src/core/card/card.module";
import { DatabaseModule } from "src/database/database.module";
import { PriceService } from "./price.service";

@Module({
    imports: [DatabaseModule, CardModule],
    providers: [PriceService],
    exports: [PriceService],
})
export class PriceModule {
    private readonly LOGGER = new Logger(PriceModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
import { Logger, Module } from "@nestjs/common";
import { CardModule } from "src/core/card/card.module";
import { DatabaseModule } from "src/database/database.module";

@Module({
    imports: [DatabaseModule, CardModule],
})
export class PriceModule {
    private readonly LOGGER = new Logger(PriceModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}
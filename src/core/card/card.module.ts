import { Logger, Module } from "@nestjs/common";
import { CardService } from "src/core/card/card.service";
import { DatabaseModule } from "src/database/database.module";

@Module({
    imports: [DatabaseModule],
    providers: [CardService],
    exports: [CardService]
})
export class CardModule {
    private readonly LOGGER: Logger = new Logger(CardModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

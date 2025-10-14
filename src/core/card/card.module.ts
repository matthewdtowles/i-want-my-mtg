import { Logger, Module } from "@nestjs/common";
import { DatabaseModule } from "src/database/database.module";
import { CardService } from "./card.service";

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

import { Module } from "@nestjs/common";
import { DatabaseModule } from "src/database/database.module";
import { getLogger } from "src/logger/global-app-logger";
import { CardService } from "./card.service";

@Module({
    imports: [DatabaseModule],
    providers: [CardService],
    exports: [CardService]
})
export class CardModule {
    private readonly LOGGER = getLogger(CardModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

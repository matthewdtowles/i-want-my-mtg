import { Logger, Module } from "@nestjs/common";
import { CardRepositoryPort, CardService } from "src/core/card";

@Module({
    imports: [],
    providers: [CardService],
    exports: [CardRepositoryPort, CardService]
})
export class CardModule {
    private readonly LOGGER: Logger = new Logger(CardModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

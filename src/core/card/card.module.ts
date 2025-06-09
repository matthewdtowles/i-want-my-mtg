import { Logger, Module } from "@nestjs/common";
import { CardMapper, CardRepositoryPort, CardService } from "src/core/card";

@Module({
    imports: [],
    providers: [CardMapper, CardService],
    exports: [CardRepositoryPort, CardMapper, CardService]
})
export class CardModule {
    private readonly LOGGER: Logger = new Logger(CardModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

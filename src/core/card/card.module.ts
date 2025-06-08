import { Logger, Module } from "@nestjs/common";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";
import { CardRepositoryPort } from "./api/card.repository.port";
import { CardMapper } from "./card.mapper";
import { CardService } from "./card.service";
import { CardRepository } from "src/infrastructure/database/card/card.repository";

@Module({
    imports: [MtgJsonIngestionModule],
    providers: [
        { provide: CardRepositoryPort, useClass: CardRepository },
        CardMapper,
        CardService
    ],
    exports: [CardRepositoryPort, CardMapper, CardService]
})
export class CardModule {
    private readonly LOGGER: Logger = new Logger(CardModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

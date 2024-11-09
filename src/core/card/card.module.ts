import { Logger, Module } from "@nestjs/common";
import { CardRepository } from "src/adapters/database/card.repository";
import { DatabaseModule } from "src/adapters/database/database.module";
import { MtgJsonIngestionModule } from "src/adapters/mtgjson-ingestion/mtgjson-ingestion.module";
import { CardRepositoryPort } from "./api/card.repository.port";
import { CardServicePort } from "./api/card.service.port";
import { CardMapper } from "./card.mapper";
import { CardService } from "./card.service";

@Module({
    imports: [DatabaseModule, MtgJsonIngestionModule],
    providers: [
        { provide: CardServicePort, useClass: CardService },
        { provide: CardRepositoryPort, useClass: CardRepository },
        CardMapper
    ],
    exports: [CardServicePort, CardRepositoryPort, CardMapper]
})
export class CardModule {
    private readonly LOGGER: Logger = new Logger(CardModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

import { Logger, Module } from "@nestjs/common";
import { DatabaseModule } from "src/adapters/database/database.module";
import { InventoryRepository } from "src/adapters/database/inventory.repository";
import { CardMapper } from "../card/card.mapper";
import { UserMapper } from "../user/user.mapper";
import { InventoryRepositoryPort } from "./api/inventory.repository.port";
import { InventoryServicePort } from "./api/inventory.service.port";
import { InventoryMapper } from "./inventory.mapper";
import { InventoryService } from "./inventory.service";

@Module({
    imports: [DatabaseModule],
    providers: [
        {
            provide: InventoryServicePort,
            useClass: InventoryService,
        },
        {
            provide: InventoryRepositoryPort,
            useClass: InventoryRepository,
        },
        InventoryMapper,
        CardMapper,
        UserMapper,
    ],
    exports: [InventoryRepositoryPort, InventoryServicePort, InventoryMapper],
})
export class InventoryModule {
    private readonly LOGGER: Logger = new Logger(InventoryModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

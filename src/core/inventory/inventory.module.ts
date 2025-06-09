import { Logger, Module } from "@nestjs/common";
import { CardMapper } from "src/core/card";
import { InventoryMapper, InventoryRepositoryPort, InventoryService } from "src/core/inventory";
import { UserMapper } from "src/core/user";

@Module({
    imports: [],
    providers: [
        InventoryMapper,
        InventoryService,
        CardMapper,
        UserMapper,
    ],
    exports: [InventoryRepositoryPort, InventoryService, InventoryMapper],
})
export class InventoryModule {
    private readonly LOGGER: Logger = new Logger(InventoryModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

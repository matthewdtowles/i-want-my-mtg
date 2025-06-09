import { Logger, Module } from "@nestjs/common";
import { InventoryRepositoryPort, InventoryService } from "src/core/inventory";

@Module({
    imports: [],
    providers: [InventoryService],
    exports: [InventoryRepositoryPort, InventoryService],
})
export class InventoryModule {
    private readonly LOGGER: Logger = new Logger(InventoryModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

import { Logger, Module } from "@nestjs/common";
import { InventoryService } from "src/core/inventory/inventory.service";
import { DatabaseModule } from "src/database/database.module";

@Module({
    imports: [DatabaseModule],
    providers: [InventoryService],
    exports: [InventoryService],
})
export class InventoryModule {
    private readonly LOGGER: Logger = new Logger(InventoryModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

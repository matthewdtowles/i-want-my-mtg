import { Logger, Module } from "@nestjs/common";
import { DatabaseModule } from "src/database/database.module";
import { InventoryService } from "./inventory.service";

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

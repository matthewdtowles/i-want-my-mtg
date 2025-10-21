import { Logger, Module } from "@nestjs/common";
import { InventoryModule } from "src/core/inventory/inventory.module";
import { DatabaseModule } from "src/database/database.module";
import { UserService } from "./user.service";

@Module({
    imports: [DatabaseModule, InventoryModule],
    providers: [UserService],
    exports: [UserService]
})
export class UserModule {
    private readonly LOGGER: Logger = new Logger(UserModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

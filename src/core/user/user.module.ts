import { Logger, Module } from "@nestjs/common";
import { InventoryModule } from "src/core/inventory/inventory.module";
import { UserService } from "src/core/user/user.service";
import { DatabaseModule } from "src/infrastructure/database/database.module";

@Module({
    imports: [DatabaseModule, InventoryModule],
    providers: [UserService],
    exports: [UserService]
})
export class UserModule {
    private readonly LOGGER: Logger = new Logger(UserModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

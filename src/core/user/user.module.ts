import { Logger, Module } from "@nestjs/common";
import { InventoryModule } from "src/core/inventory/inventory.module";
import { UserMapper, UserRepositoryPort, UserService } from "src/core/user";

@Module({
    imports: [InventoryModule],
    providers: [UserService, UserMapper],
    exports: [UserRepositoryPort, UserService, UserMapper]
})
export class UserModule {
    private readonly LOGGER: Logger = new Logger(UserModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

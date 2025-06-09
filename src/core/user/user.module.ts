import { Logger, Module } from "@nestjs/common";
import { InventoryModule } from "src/core/inventory";
import { UserRepositoryPort, UserService } from "src/core/user";

@Module({
    imports: [InventoryModule],
    providers: [UserService],
    exports: [UserRepositoryPort, UserService]
})
export class UserModule {
    private readonly LOGGER: Logger = new Logger(UserModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

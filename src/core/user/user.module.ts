import { Logger, Module } from "@nestjs/common";
import { DatabaseModule } from "src/adapters/database/database.module";
import { UserRepository } from "src/adapters/database/user.repository";
import { InventoryModule } from "../inventory/inventory.module";
import { UserRepositoryPort } from "./api/user.repository.port";
import { UserServicePort } from "./api/user.service.port";
import { UserMapper } from "./user.mapper";
import { UserService } from "./user.service";

@Module({
    imports: [DatabaseModule, InventoryModule],
    providers: [
        { provide: UserServicePort, useClass: UserService },
        { provide: UserRepositoryPort, useClass: UserRepository },
        UserMapper,
    ],
    exports: [UserRepositoryPort, UserServicePort, UserMapper]
})
export class UserModule {
    private readonly LOGGER: Logger = new Logger(UserModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

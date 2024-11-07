import { Logger, Module } from "@nestjs/common";
import { CoreModule } from "src/core/core.module";
import { AuthController } from "./auth/auth.controller";
import { CardController } from "./card.controller";
import { HomeController } from "./home.controller";
import { InventoryController } from "./inventory.controller";
import { SetController } from "./set.controller";
import { UserController } from "./user.controller";

@Module({
    controllers: [
        AuthController,
        CardController,
        HomeController,
        InventoryController,
        SetController,
        UserController,
    ],
    imports: [CoreModule],
    // exports: [CoreModule],
})
export class HttpModule {
    private readonly LOGGER: Logger = new Logger(HttpModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

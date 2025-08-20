import { Logger, Module } from "@nestjs/common";
import { CoreModule } from "src/core/core.module";
import { AuthOrchestrator } from "src/http/auth/auth.orchestrator";
import { CardOrchestrator } from "src/http/card/card.orchestrator";
import { InventoryOrchestrator } from "src/http/inventory/inventory.orchestrator";
import { SetOrchestrator } from "src/http/set/set.orchestrator";
import { UserOrchestrator } from "src/http/user/user.orchestrator";
import { AuthController } from "./auth/auth.controller";
import { CardController } from "./card/card.controller";
import { HomeController } from "./home.controller";
import { InventoryController } from "./inventory/inventory.controller";
import { SetController } from "./set/set.controller";
import { UserController } from "./user/user.controller";

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
    providers: [
        AuthOrchestrator,
        CardOrchestrator,
        InventoryOrchestrator,
        SetOrchestrator,
        UserOrchestrator
    ],
    exports: [
        AuthOrchestrator,
        CardOrchestrator,
        InventoryOrchestrator,
        SetOrchestrator,
        UserOrchestrator
    ],
})
export class HttpModule {
    private readonly LOGGER: Logger = new Logger(HttpModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

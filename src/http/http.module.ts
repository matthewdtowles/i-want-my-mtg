import { Module } from "@nestjs/common";
import { CoreModule } from "src/core/core.module";
import { getLogger } from "src/logger/global-app-logger";
import { AuthController } from "./auth/auth.controller";
import { AuthOrchestrator } from "./auth/auth.orchestrator";
import { CardController } from "./card/card.controller";
import { CardOrchestrator } from "./card/card.orchestrator";
import { HomeController } from "./home.controller";
import { InventoryController } from "./inventory/inventory.controller";
import { InventoryOrchestrator } from "./inventory/inventory.orchestrator";
import { SetController } from "./set/set.controller";
import { SetOrchestrator } from "./set/set.orchestrator";
import { UserController } from "./user/user.controller";
import { UserOrchestrator } from "./user/user.orchestrator";

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
    private readonly LOGGER = getLogger(HttpModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

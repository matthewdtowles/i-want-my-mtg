import { Logger, Module } from "@nestjs/common";
import { CoreModule } from "src/core/core.module";
import { AuthController } from "./auth/auth.controller";
import { CardController } from "./card/card.controller";
import { HomeController } from "./home.controller";
import { InventoryController } from "./inventory/inventory.controller";
import { SetController } from "./set/set.controller";
import { UserController } from "./user/user.controller";
import { CardOrchestrator } from "src/adapters/http/card/card.orchestrator";
import { InventoryOrchestrator } from "src/adapters/http/inventory/inventory.orchestrator";
import { SetOrchestrator } from "src/adapters/http/set/set.orchestrator";

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
    providers: [CardOrchestrator, InventoryOrchestrator, SetOrchestrator],
    exports: [CardOrchestrator, InventoryOrchestrator, SetOrchestrator],
})
export class HttpModule {
    private readonly LOGGER: Logger = new Logger(HttpModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

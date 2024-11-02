import { Logger, Module } from "@nestjs/common";
import { CoreModule } from "src/core/core.module";
import { CardCli } from "./card.cli";
import { InventoryCli } from "./inventory.cli";
import { SetCli } from "./set.cli";
import { UserCli } from "./user.cli";

@Module({
    imports: [CoreModule],
    providers: [CardCli, InventoryCli, UserCli, SetCli],
    exports: [CardCli, InventoryCli, UserCli, SetCli],
})
export class CoreCliModule {
    private readonly LOGGER: Logger = new Logger(CoreCliModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

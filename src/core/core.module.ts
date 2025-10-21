import { Logger, Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { CardModule } from "./card/card.module";
import { InventoryModule } from "./inventory/inventory.module";
import { SetModule } from "./set/set.module";
import { UserModule } from "./user/user.module";


@Module({
    imports: [
        AuthModule,
        CardModule,
        InventoryModule,
        SetModule,
        UserModule
    ],
    exports: [
        AuthModule,
        CardModule,
        InventoryModule,
        SetModule,
        UserModule
    ]
})
export class CoreModule {
    private readonly LOGGER: Logger = new Logger(CoreModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

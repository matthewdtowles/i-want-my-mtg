import { Logger, Module } from "@nestjs/common";
import { AuthModule } from "src/core/auth/auth.module";
import { CardModule } from "src/core/card/card.module";
import { IngestionModule } from "src/core/ingestion/ingestion.module";
import { InventoryModule } from "src/core/inventory/inventory.module";
import { SetModule } from "src/core/set/set.module";
import { UserModule } from "src/core/user/user.module";


@Module({
    imports: [
        AuthModule,
        CardModule,
        IngestionModule,
        InventoryModule,
        SetModule,
        UserModule
    ],
    exports: [
        AuthModule,
        CardModule,
        IngestionModule,
        InventoryModule,
        SetModule,
        UserModule
    ]
})
export class CoreModule {
    private readonly LOGGER: Logger = new Logger(CoreModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

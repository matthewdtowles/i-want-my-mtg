import { Logger, Module } from "@nestjs/common";
import { AuthModule } from "src/core/auth";
import { CardModule } from "src/core/card";
import { IngestionModule } from "src/core/ingestion";
import { InventoryModule } from "src/core/inventory";
import { SetModule } from "src/core/set";
import { UserModule } from "src/core/user";

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

import { Logger, Module } from "@nestjs/common";
import { AggregatorModule } from "./aggregator/aggregator.module";
import { AuthModule } from "./auth/auth.module";
import { CardModule } from "./card/card.module";
import { IngestionModule } from "./ingestion/ingestion.module";
import { InventoryModule } from "./inventory/inventory.module";
import { SetModule } from "./set/set.module";
import { UserModule } from "./user/user.module";

@Module({
    imports: [
        AggregatorModule,
        AuthModule,
        CardModule,
        IngestionModule,
        InventoryModule,
        SetModule,
        UserModule,
    ],
    exports: [
        AggregatorModule,
        AuthModule,
        CardModule,
        IngestionModule,
        InventoryModule,
        SetModule,
        UserModule,
    ],
})
export class CoreModule {
    private readonly LOGGER: Logger = new Logger(CoreModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}

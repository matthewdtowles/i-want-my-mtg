import { Logger, Module } from '@nestjs/common';
import { CardModule } from './card/card.module';
import { InventoryModule } from './inventory/inventory.module';
import { SetModule } from './set/set.module';
import { UserModule } from './user/user.module';
import { IngestionModule } from './ingestion/ingestion.module';

@Module({
    imports: [
        CardModule,
        InventoryModule,
        SetModule,  
        UserModule,
        IngestionModule,
    ],
    exports: [
        CardModule,
        InventoryModule,
        SetModule,
        UserModule,
        IngestionModule,
    ]
})
export class CoreModule {
    private readonly LOGGER: Logger = new Logger(CoreModule.name);

    constructor() {
        this.LOGGER.debug(`Initialized`);
    }
}
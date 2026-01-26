import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { InventoryService } from './inventory.service';

@Module({
    imports: [DatabaseModule],
    providers: [InventoryService],
    exports: [InventoryService],
})
export class InventoryModule {
    private readonly LOGGER = getLogger(InventoryModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ImportModule } from 'src/core/import/import.module';
import { getLogger } from 'src/logger/global-app-logger';
import { InventoryExportService } from './export/inventory-export.service';
import { InventoryImportService } from './import/inventory-import.service';
import { InventoryService } from './inventory.service';

@Module({
    imports: [DatabaseModule, ImportModule],
    providers: [InventoryService, InventoryImportService, InventoryExportService],
    exports: [InventoryService, InventoryImportService, InventoryExportService],
})
export class InventoryModule {
    private readonly LOGGER = getLogger(InventoryModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

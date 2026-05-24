import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { CardModule } from 'src/core/card/card.module';
import { ImportModule } from 'src/core/import/import.module';
import { InventoryModule } from 'src/core/inventory/inventory.module';
import { getLogger } from 'src/logger/global-app-logger';
import { TransactionExportService } from './export/transaction-export.service';
import { TransactionImportService } from './import/transaction-import.service';
import { TransactionService } from './transaction.service';

@Module({
    imports: [DatabaseModule, ImportModule, InventoryModule, CardModule],
    providers: [TransactionService, TransactionImportService, TransactionExportService],
    exports: [TransactionService, TransactionImportService, TransactionExportService],
})
export class TransactionModule {
    private readonly LOGGER = getLogger(TransactionModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

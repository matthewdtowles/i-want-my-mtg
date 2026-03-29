import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ImportModule } from 'src/core/import/import.module';
import { InventoryModule } from 'src/core/inventory/inventory.module';
import { getLogger } from 'src/logger/global-app-logger';
import { TransactionImportService } from './import/transaction-import.service';
import { TransactionService } from './transaction.service';

@Module({
    imports: [DatabaseModule, ImportModule, InventoryModule],
    providers: [TransactionService, TransactionImportService],
    exports: [TransactionService, TransactionImportService],
})
export class TransactionModule {
    private readonly LOGGER = getLogger(TransactionModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

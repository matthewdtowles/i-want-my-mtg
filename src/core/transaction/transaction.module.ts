import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { InventoryModule } from 'src/core/inventory/inventory.module';
import { getLogger } from 'src/logger/global-app-logger';
import { TransactionService } from './transaction.service';

@Module({
    imports: [DatabaseModule, forwardRef(() => InventoryModule)],
    providers: [TransactionService],
    exports: [TransactionService],
})
export class TransactionModule {
    private readonly LOGGER = getLogger(TransactionModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

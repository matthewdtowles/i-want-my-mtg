import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { TransactionService } from './transaction.service';

@Module({
    imports: [DatabaseModule],
    providers: [TransactionService],
    exports: [TransactionService],
})
export class TransactionModule {
    private readonly LOGGER = getLogger(TransactionModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

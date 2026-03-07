import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/database/database.module';
import { InventoryModule } from 'src/core/inventory/inventory.module';
import { TransactionModule } from 'src/core/transaction/transaction.module';
import { getLogger } from 'src/logger/global-app-logger';
import { PortfolioService } from './portfolio.service';
import { PortfolioSummaryService } from './portfolio-summary.service';

@Module({
    imports: [
        ConfigModule,
        DatabaseModule,
        forwardRef(() => InventoryModule),
        forwardRef(() => TransactionModule),
    ],
    providers: [PortfolioService, PortfolioSummaryService],
    exports: [PortfolioService, PortfolioSummaryService],
})
export class PortfolioModule {
    private readonly LOGGER = getLogger(PortfolioModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

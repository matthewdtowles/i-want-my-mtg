import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/database/database.module';
import { InventoryModule } from 'src/core/inventory/inventory.module';
import { TransactionModule } from 'src/core/transaction/transaction.module';
import { getLogger } from 'src/logger/global-app-logger';
import { PortfolioService } from './portfolio.service';
import { PortfolioSummaryService } from './portfolio-summary.service';
import { PortfolioComputationService } from './portfolio-computation.service';

@Module({
    imports: [ConfigModule, DatabaseModule, InventoryModule, TransactionModule],
    providers: [PortfolioService, PortfolioSummaryService, PortfolioComputationService],
    exports: [PortfolioService, PortfolioSummaryService],
})
export class PortfolioModule {
    private readonly LOGGER = getLogger(PortfolioModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

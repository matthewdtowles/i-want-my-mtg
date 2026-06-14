import { Module } from '@nestjs/common';
import { BuyListModule } from 'src/core/buy-list/buy-list.module';
import { InventoryModule } from 'src/core/inventory/inventory.module';
import { SellOptimizerService } from './sell-optimizer.service';

@Module({
    imports: [InventoryModule, BuyListModule],
    providers: [SellOptimizerService],
    exports: [SellOptimizerService],
})
export class OptimizerModule {}

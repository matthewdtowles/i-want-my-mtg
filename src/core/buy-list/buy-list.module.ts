import { Module } from '@nestjs/common';
import { ImportModule } from 'src/core/import/import.module';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { BuyListService } from './buy-list.service';

@Module({
    imports: [DatabaseModule, ImportModule],
    providers: [BuyListService],
    exports: [BuyListService],
})
export class BuyListModule {
    private readonly LOGGER = getLogger(BuyListModule.name);

    constructor() {
        this.LOGGER.log('Initialized');
    }
}

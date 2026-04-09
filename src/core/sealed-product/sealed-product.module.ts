import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { SealedProductService } from './sealed-product.service';

@Module({
    imports: [DatabaseModule],
    providers: [SealedProductService],
    exports: [SealedProductService],
})
export class SealedProductModule {
    private readonly LOGGER = getLogger(SealedProductModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

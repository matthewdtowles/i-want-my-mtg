import { Module } from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';
import { ApiTierModule } from './api-tier/api-tier.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { CardModule } from './card/card.module';
import { EmailModule } from './email/email.module';
import { ImportModule } from './import/import.module';
import { InventoryModule } from './inventory/inventory.module';
import { PasswordResetModule } from './password-reset/password-reset.module';
import { PriceAlertModule } from './price-alert/price-alert.module';
import { SearchModule } from './search/search.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { SealedProductModule } from './sealed-product/sealed-product.module';
import { SetModule } from './set/set.module';
import { TransactionModule } from './transaction/transaction.module';
import { UserModule } from './user/user.module';

@Module({
    imports: [
        ApiTierModule,
        AuthModule,
        BillingModule,
        CardModule,
        EmailModule,
        ImportModule,
        InventoryModule,
        PasswordResetModule,
        PriceAlertModule,
        PortfolioModule,
        SealedProductModule,
        SearchModule,
        SetModule,
        TransactionModule,
        UserModule,
    ],
    exports: [
        ApiTierModule,
        AuthModule,
        BillingModule,
        CardModule,
        EmailModule,
        ImportModule,
        InventoryModule,
        PasswordResetModule,
        PriceAlertModule,
        PortfolioModule,
        SealedProductModule,
        SearchModule,
        SetModule,
        TransactionModule,
        UserModule,
    ],
})
export class CoreModule {
    private readonly LOGGER = getLogger(CoreModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

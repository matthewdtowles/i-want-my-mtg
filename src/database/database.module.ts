import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardRepositoryPort } from 'src/core/card/ports/card.repository.port';
import { PriceHistoryRepositoryPort } from 'src/core/card/ports/price-history.repository.port';
import { InventoryRepositoryPort } from 'src/core/inventory/ports/inventory.repository.port';
import { PasswordResetRepositoryPort } from 'src/core/password-reset/ports/password-reset.repository.port';
import { SetPriceHistoryRepositoryPort } from 'src/core/set/ports/set-price-history.repository.port';
import { SetRepositoryPort } from 'src/core/set/ports/set.repository.port';
import { PortfolioCardPerformanceRepositoryPort } from 'src/core/portfolio/ports/portfolio-card-performance.repository.port';
import { PortfolioSummaryRepositoryPort } from 'src/core/portfolio/ports/portfolio-summary.repository.port';
import { PortfolioValueHistoryRepositoryPort } from 'src/core/portfolio/ports/portfolio-value-history.repository.port';
import { TransactionRepositoryPort } from 'src/core/transaction/ports/transaction.repository.port';
import { UserRepositoryPort } from 'src/core/user/ports/user.repository.port';
import { PriceAlertRepositoryPort } from 'src/core/price-alert/ports/price-alert.repository.port';
import { PriceNotificationRepositoryPort } from 'src/core/price-alert/ports/price-notification.repository.port';
import { SealedProductRepositoryPort } from 'src/core/sealed-product/ports/sealed-product.repository.port';
import { PendingUserRepositoryPort } from 'src/core/user/ports/pending-user.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { CardOrmEntity } from './card/card.orm-entity';
import { CardRepository } from './card/card.repository';
import { LegalityOrmEntity } from './card/legality.orm-entity';
import { InventoryOrmEntity } from './inventory/inventory.orm-entity';
import { InventoryRepository } from './inventory/inventory.repository';
import { PasswordResetOrmEntity } from './password-reset/password-reset.orm-entity';
import { PasswordResetRepository } from './password-reset/password-reset.repository';
import { PriceHistoryOrmEntity } from './price-history/price-history.orm-entity';
import { PriceHistoryRepository } from './price-history/price-history.repository';
import { PriceOrmEntity } from './price/price.orm-entity';
import { SetPriceHistoryOrmEntity } from './set-price-history/set-price-history.orm-entity';
import { SetPriceHistoryRepository } from './set-price-history/set-price-history.repository';
import { SetPriceOrmEntity } from './set/set-price.orm-entity';
import { SetOrmEntity } from './set/set.orm-entity';
import { SetRepository } from './set/set.repository';
import { PortfolioCardPerformanceOrmEntity } from './portfolio/portfolio-card-performance.orm-entity';
import { PortfolioCardPerformanceRepository } from './portfolio/portfolio-card-performance.repository';
import { PortfolioSummaryOrmEntity } from './portfolio/portfolio-summary.orm-entity';
import { PortfolioSummaryRepository } from './portfolio/portfolio-summary.repository';
import { PortfolioValueHistoryOrmEntity } from './portfolio/portfolio-value-history.orm-entity';
import { PortfolioValueHistoryRepository } from './portfolio/portfolio-value-history.repository';
import { TransactionOrmEntity } from './transaction/transaction.orm-entity';
import { TransactionRepository } from './transaction/transaction.repository';
import { UserOrmEntity } from './user/user.orm-entity';
import { UserRepository } from './user/user.repository';
import { PriceAlertOrmEntity } from './price-alert/price-alert.orm-entity';
import { PriceAlertRepository } from './price-alert/price-alert.repository';
import { PriceNotificationOrmEntity } from './price-alert/price-notification.orm-entity';
import { PriceNotificationRepository } from './price-alert/price-notification.repository';
import { SealedProductInventoryOrmEntity } from './sealed-product/sealed-product-inventory.orm-entity';
import { SealedProductPriceHistoryOrmEntity } from './sealed-product/sealed-product-price-history.orm-entity';
import { SealedProductPriceOrmEntity } from './sealed-product/sealed-product-price.orm-entity';
import { SealedProductOrmEntity } from './sealed-product/sealed-product.orm-entity';
import { SealedProductRepository } from './sealed-product/sealed-product.repository';
import { PendingUserOrmEntity } from './user/pending-user.orm-entity';
import { PendingUserRepository } from './user/pending-user.repository';
import { SubscriptionRepositoryPort } from 'src/core/billing/ports/subscription.repository.port';
import { SubscriptionOrmEntity } from './subscription/subscription.orm-entity';
import { SubscriptionRepository } from './subscription/subscription.repository';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            CardOrmEntity,
            InventoryOrmEntity,
            LegalityOrmEntity,
            PasswordResetOrmEntity,
            PriceHistoryOrmEntity,
            PriceOrmEntity,
            SetOrmEntity,
            SetPriceOrmEntity,
            SetPriceHistoryOrmEntity,
            PortfolioCardPerformanceOrmEntity,
            PortfolioSummaryOrmEntity,
            PortfolioValueHistoryOrmEntity,
            PriceAlertOrmEntity,
            PriceNotificationOrmEntity,
            SealedProductOrmEntity,
            SealedProductPriceOrmEntity,
            SealedProductPriceHistoryOrmEntity,
            SealedProductInventoryOrmEntity,
            TransactionOrmEntity,
            UserOrmEntity,
            PendingUserOrmEntity,
            SubscriptionOrmEntity,
        ]),
    ],
    providers: [
        { provide: CardRepositoryPort, useClass: CardRepository },
        { provide: PriceHistoryRepositoryPort, useClass: PriceHistoryRepository },
        { provide: InventoryRepositoryPort, useClass: InventoryRepository },
        { provide: PasswordResetRepositoryPort, useClass: PasswordResetRepository },
        { provide: SetPriceHistoryRepositoryPort, useClass: SetPriceHistoryRepository },
        { provide: SetRepositoryPort, useClass: SetRepository },
        {
            provide: PortfolioCardPerformanceRepositoryPort,
            useClass: PortfolioCardPerformanceRepository,
        },
        { provide: PortfolioSummaryRepositoryPort, useClass: PortfolioSummaryRepository },
        { provide: PortfolioValueHistoryRepositoryPort, useClass: PortfolioValueHistoryRepository },
        { provide: PriceAlertRepositoryPort, useClass: PriceAlertRepository },
        { provide: PriceNotificationRepositoryPort, useClass: PriceNotificationRepository },
        { provide: SealedProductRepositoryPort, useClass: SealedProductRepository },
        { provide: TransactionRepositoryPort, useClass: TransactionRepository },
        { provide: UserRepositoryPort, useClass: UserRepository },
        { provide: PendingUserRepositoryPort, useClass: PendingUserRepository },
        { provide: SubscriptionRepositoryPort, useClass: SubscriptionRepository },
    ],
    exports: [
        CardRepositoryPort,
        PriceHistoryRepositoryPort,
        InventoryRepositoryPort,
        PasswordResetRepositoryPort,
        SetPriceHistoryRepositoryPort,
        SetRepositoryPort,
        PortfolioCardPerformanceRepositoryPort,
        PortfolioSummaryRepositoryPort,
        PortfolioValueHistoryRepositoryPort,
        PriceAlertRepositoryPort,
        PriceNotificationRepositoryPort,
        SealedProductRepositoryPort,
        TransactionRepositoryPort,
        UserRepositoryPort,
        PendingUserRepositoryPort,
        SubscriptionRepositoryPort,
    ],
})
export class DatabaseModule {
    private readonly LOGGER = getLogger(DatabaseModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

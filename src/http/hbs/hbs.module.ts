import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from 'src/core/core.module';
import { AuthController } from './auth/auth.controller';
import { AuthOrchestrator } from './auth/auth.orchestrator';
import { BillingController } from './billing/billing.controller';
import { BillingOrchestrator } from './billing/billing.orchestrator';
import { PricingController } from './billing/pricing.controller';
import { PricingOrchestrator } from './billing/pricing.orchestrator';
import { SubscriptionViewInterceptor } from './shared/subscription-view.interceptor';
import { CardController } from './card/card.controller';
import { CardOrchestrator } from './card/card.orchestrator';
import { HomeController } from './home/home.controller';
import { InventoryController } from './inventory/inventory.controller';
import { NotificationPageController } from './notification/notification-page.controller';
import { NotificationPageOrchestrator } from './notification/notification-page.orchestrator';
import { UploadRateLimitGuard } from './inventory/guards/upload-rate-limit.guard';
import { InventoryOrchestrator } from './inventory/inventory.orchestrator';
import { PortfolioController } from './portfolio/portfolio.controller';
import { PortfolioOrchestrator } from './portfolio/portfolio.orchestrator';
import { PriceAlertPageController } from './price-alert/price-alert-page.controller';
import { PriceAlertPageOrchestrator } from './price-alert/price-alert-page.orchestrator';
import { SealedProductController } from './sealed-product/sealed-product.controller';
import { SealedProductOrchestrator } from './sealed-product/sealed-product.orchestrator';
import { SearchController } from './search/search.controller';
import { SearchOrchestrator } from './search/search.orchestrator';
import { SetController } from './set/set.controller';
import { SetOrchestrator } from './set/set.orchestrator';
import { SitemapController } from './sitemap/sitemap.controller';
import { SpoilersController } from './set/spoilers.controller';
import { TransactionController } from './transaction/transaction.controller';
import { TransactionOrchestrator } from './transaction/transaction.orchestrator';
import { UserController } from './user/user.controller';
import { UserOrchestrator } from './user/user.orchestrator';

@Module({
    imports: [ConfigModule, CoreModule],
    controllers: [
        AuthController,
        BillingController,
        PricingController,
        CardController,
        HomeController,
        InventoryController,
        NotificationPageController,
        PortfolioController,
        PriceAlertPageController,
        SealedProductController,
        SearchController,
        SetController,
        SitemapController,
        SpoilersController,
        TransactionController,
        UserController,
    ],
    providers: [
        UploadRateLimitGuard,
        AuthOrchestrator,
        BillingOrchestrator,
        PricingOrchestrator,
        { provide: APP_INTERCEPTOR, useClass: SubscriptionViewInterceptor },
        CardOrchestrator,
        InventoryOrchestrator,
        NotificationPageOrchestrator,
        PortfolioOrchestrator,
        PriceAlertPageOrchestrator,
        SealedProductOrchestrator,
        SearchOrchestrator,
        SetOrchestrator,
        TransactionOrchestrator,
        UserOrchestrator,
    ],
    exports: [
        AuthOrchestrator,
        BillingOrchestrator,
        PricingOrchestrator,
        CardOrchestrator,
        InventoryOrchestrator,
        NotificationPageOrchestrator,
        PortfolioOrchestrator,
        PriceAlertPageOrchestrator,
        SealedProductOrchestrator,
        SearchOrchestrator,
        SetOrchestrator,
        TransactionOrchestrator,
        UserOrchestrator,
    ],
})
export class HbsModule {}

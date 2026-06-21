import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from 'src/core/core.module';
import { ApiKeyPageController } from './api-tier/api-key.controller';
import { DeveloperController } from './api-tier/developer.controller';
import { AuthController } from './auth/auth.controller';
import { AuthOrchestrator } from './auth/auth.orchestrator';
import { BillingController } from './billing/billing.controller';
import { BillingOrchestrator } from './billing/billing.orchestrator';
import { BlogController } from './blog/blog.controller';
import { BuyListPageController } from './buy-list/buy-list-page.controller';
import { BuyListPageOrchestrator } from './buy-list/buy-list-page.orchestrator';
import { DeckPageController } from './deck/deck-page.controller';
import { DeckPageOrchestrator } from './deck/deck-page.orchestrator';
import { SellOptimizerController } from './optimizer/sell-optimizer.controller';
import { SellOptimizerOrchestrator } from './optimizer/sell-optimizer.orchestrator';
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
import { PublishedDeckController } from './published-deck/published-deck.controller';
import { PublishedDeckOrchestrator } from './published-deck/published-deck.orchestrator';
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
        ApiKeyPageController,
        DeveloperController,
        AuthController,
        BillingController,
        PricingController,
        BlogController,
        BuyListPageController,
        DeckPageController,
        SellOptimizerController,
        CardController,
        HomeController,
        InventoryController,
        NotificationPageController,
        PortfolioController,
        PriceAlertPageController,
        PublishedDeckController,
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
        BuyListPageOrchestrator,
        DeckPageOrchestrator,
        SellOptimizerOrchestrator,
        CardOrchestrator,
        InventoryOrchestrator,
        NotificationPageOrchestrator,
        PortfolioOrchestrator,
        PriceAlertPageOrchestrator,
        PublishedDeckOrchestrator,
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
        BuyListPageOrchestrator,
        DeckPageOrchestrator,
        SellOptimizerOrchestrator,
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

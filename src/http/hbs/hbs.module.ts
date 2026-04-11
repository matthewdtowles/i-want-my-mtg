import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from 'src/core/core.module';
import { AuthController } from './auth/auth.controller';
import { AuthOrchestrator } from './auth/auth.orchestrator';
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

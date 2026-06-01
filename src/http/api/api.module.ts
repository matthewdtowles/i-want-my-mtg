import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CoreModule } from 'src/core/core.module';
import { ApiKeyApiController } from './api-tier/api-key-api.controller';
import { AuthApiController } from './auth/auth-api.controller';
import { BillingApiController } from './billing/billing-api.controller';
import { StripeWebhookController } from './billing/stripe-webhook.controller';
import { CardApiController } from './card/card-api.controller';
import { InventoryApiController } from './inventory/inventory-api.controller';
import { PortfolioApiController } from './portfolio/portfolio-api.controller';
import { SetApiController } from './set/set-api.controller';
import { TransactionApiController } from './transaction/transaction-api.controller';
import { PriceAlertApiController } from './price-alert/price-alert-api.controller';
import { PriceNotificationApiController } from './price-alert/price-notification-api.controller';
import { SealedProductApiController } from './sealed-product/sealed-product-api.controller';
import { UserApiController } from './user/user-api.controller';
import { ApiKeyAuthGuard } from './shared/api-key-auth.guard';
import { ApiRateLimitGuard } from './shared/api-rate-limit.guard';
import { CacheControlInterceptor } from './shared/cache-control.interceptor';
import { JwtOrApiKeyGuard } from './shared/jwt-or-api-key.guard';
import { OptionalAuthOrApiKeyGuard } from './shared/optional-auth-or-api-key.guard';
import { RapidApiProxyGuard } from './shared/rapidapi-proxy.guard';

@Module({
    imports: [ConfigModule, CoreModule],
    controllers: [
        ApiKeyApiController,
        AuthApiController,
        BillingApiController,
        StripeWebhookController,
        CardApiController,
        InventoryApiController,
        PortfolioApiController,
        PriceAlertApiController,
        PriceNotificationApiController,
        SealedProductApiController,
        SetApiController,
        TransactionApiController,
        UserApiController,
    ],
    providers: [
        ApiKeyAuthGuard,
        ApiRateLimitGuard,
        JwtOrApiKeyGuard,
        OptionalAuthOrApiKeyGuard,
        RapidApiProxyGuard,
        { provide: APP_INTERCEPTOR, useClass: CacheControlInterceptor },
    ],
    // Exported so the MCP driving adapter (src/mcp) reuses the same guard
    // instances — sharing in-memory burst state and the per-key daily quota.
    // The two route guards pull in these deps transitively, so they must be
    // exported too for resolution in the importing module.
    exports: [
        OptionalAuthOrApiKeyGuard,
        ApiRateLimitGuard,
        ApiKeyAuthGuard,
        RapidApiProxyGuard,
    ],
})
export class ApiModule {}

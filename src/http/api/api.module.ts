import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CoreModule } from 'src/core/core.module';
import { AuthApiController } from './auth/auth-api.controller';
import { CardApiController } from './card/card-api.controller';
import { InventoryApiController } from './inventory/inventory-api.controller';
import { PortfolioApiController } from './portfolio/portfolio-api.controller';
import { SetApiController } from './set/set-api.controller';
import { TransactionApiController } from './transaction/transaction-api.controller';
import { PriceAlertApiController } from './price-alert/price-alert-api.controller';
import { PriceNotificationApiController } from './price-alert/price-notification-api.controller';
import { UserApiController } from './user/user-api.controller';
import { ApiRateLimitGuard } from './shared/api-rate-limit.guard';
import { CacheControlInterceptor } from './shared/cache-control.interceptor';

@Module({
    imports: [ConfigModule, CoreModule],
    controllers: [
        AuthApiController,
        CardApiController,
        InventoryApiController,
        PortfolioApiController,
        PriceAlertApiController,
        PriceNotificationApiController,
        SetApiController,
        TransactionApiController,
        UserApiController,
    ],
    providers: [ApiRateLimitGuard, { provide: APP_INTERCEPTOR, useClass: CacheControlInterceptor }],
})
export class ApiModule {}

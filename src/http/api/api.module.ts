import { Module } from '@nestjs/common';
import { CoreModule } from 'src/core/core.module';
import { AuthApiController } from './auth/auth-api.controller';
import { CardApiController } from './card/card-api.controller';
import { InventoryApiController } from './inventory/inventory-api.controller';
import { PortfolioApiController } from './portfolio/portfolio-api.controller';
import { SetApiController } from './set/set-api.controller';
import { TransactionApiController } from './transaction/transaction-api.controller';
import { UserApiController } from './user/user-api.controller';
import { ApiRateLimitGuard } from './shared/api-rate-limit.guard';

@Module({
    imports: [CoreModule],
    controllers: [
        AuthApiController,
        CardApiController,
        InventoryApiController,
        PortfolioApiController,
        SetApiController,
        TransactionApiController,
        UserApiController,
    ],
    providers: [ApiRateLimitGuard],
})
export class ApiModule {}

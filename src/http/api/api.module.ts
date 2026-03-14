import { Module } from '@nestjs/common';
import { CoreModule } from 'src/core/core.module';
import { AuthApiController } from './controllers/auth-api.controller';
import { CardApiController } from './controllers/card-api.controller';
import { InventoryApiController } from './controllers/inventory-api.controller';
import { PortfolioApiController } from './controllers/portfolio-api.controller';
import { SetApiController } from './controllers/set-api.controller';
import { TransactionApiController } from './controllers/transaction-api.controller';
import { UserApiController } from './controllers/user-api.controller';
import { ApiRateLimitGuard } from './guards/api-rate-limit.guard';

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

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule } from 'src/core/core.module';
import { getLogger } from 'src/logger/global-app-logger';
import { AuthController } from './auth/auth.controller';
import { AuthOrchestrator } from './auth/auth.orchestrator';
import { CardController } from './card/card.controller';
import { CardOrchestrator } from './card/card.orchestrator';
import { HomeController } from './home.controller';
import { InventoryController } from './inventory/inventory.controller';
import { InventoryOrchestrator } from './inventory/inventory.orchestrator';
import { SearchController } from './search/search.controller';
import { SearchOrchestrator } from './search/search.orchestrator';
import { SetController } from './set/set.controller';
import { SetOrchestrator } from './set/set.orchestrator';
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
        SearchController,
        SetController,
        SpoilersController,
        TransactionController,
        UserController,
    ],
    providers: [
        AuthOrchestrator,
        CardOrchestrator,
        InventoryOrchestrator,
        SearchOrchestrator,
        SetOrchestrator,
        TransactionOrchestrator,
        UserOrchestrator,
    ],
    exports: [
        AuthOrchestrator,
        CardOrchestrator,
        InventoryOrchestrator,
        SearchOrchestrator,
        SetOrchestrator,
        TransactionOrchestrator,
        UserOrchestrator,
    ],
})
export class HttpModule {
    private readonly LOGGER = getLogger(HttpModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

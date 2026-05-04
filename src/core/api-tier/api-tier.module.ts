import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { ApiKeyService } from './api-key.service';
import { ApiSubscriptionService } from './api-subscription.service';
import { ApiUsageService } from './api-usage.service';

@Module({
    imports: [DatabaseModule],
    providers: [ApiKeyService, ApiSubscriptionService, ApiUsageService],
    exports: [ApiKeyService, ApiSubscriptionService, ApiUsageService],
})
export class ApiTierModule {
    private readonly LOGGER = getLogger(ApiTierModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

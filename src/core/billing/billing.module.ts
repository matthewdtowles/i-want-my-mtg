import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { StripeGatewayPort } from './ports/stripe-gateway.port';
import { StripeGateway } from './stripe.gateway';
import { SubscriptionGuard } from './subscription.guard';
import { SubscriptionService } from './subscription.service';

@Module({
    imports: [ConfigModule, DatabaseModule],
    providers: [
        SubscriptionService,
        { provide: StripeGatewayPort, useClass: StripeGateway },
        SubscriptionGuard,
    ],
    exports: [SubscriptionService, StripeGatewayPort, SubscriptionGuard],
})
export class BillingModule {
    private readonly LOGGER = getLogger(BillingModule.name);

    constructor() {
        this.LOGGER.log(`Initialized`);
    }
}

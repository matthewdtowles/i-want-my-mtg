import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { EmailModule } from 'src/core/email/email.module';
import { UserModule } from 'src/core/user/user.module';
import { getLogger } from 'src/logger/global-app-logger';
import { PriceAlertService } from './price-alert.service';
import { PriceNotificationService } from './price-notification.service';

@Module({
    imports: [DatabaseModule, EmailModule, UserModule],
    providers: [PriceAlertService, PriceNotificationService],
    exports: [PriceAlertService, PriceNotificationService],
})
export class PriceAlertModule {
    private readonly LOGGER = getLogger(PriceAlertModule.name);

    constructor() {
        this.LOGGER.log('Initialized');
    }
}

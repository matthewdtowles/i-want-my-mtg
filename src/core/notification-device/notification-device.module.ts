import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { NotificationDeviceService } from './notification-device.service';
import { PushService } from './push.service';

@Module({
    imports: [DatabaseModule],
    providers: [NotificationDeviceService, PushService],
    exports: [NotificationDeviceService, PushService],
})
export class NotificationDeviceModule {
    private readonly LOGGER = getLogger(NotificationDeviceModule.name);

    constructor() {
        this.LOGGER.log('Initialized');
    }
}

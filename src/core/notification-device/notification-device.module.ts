import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { getLogger } from 'src/logger/global-app-logger';
import { NotificationDeviceService } from './notification-device.service';

@Module({
    imports: [DatabaseModule],
    providers: [NotificationDeviceService],
    exports: [NotificationDeviceService],
})
export class NotificationDeviceModule {
    private readonly LOGGER = getLogger(NotificationDeviceModule.name);

    constructor() {
        this.LOGGER.log('Initialized');
    }
}

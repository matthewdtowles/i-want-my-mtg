import { Inject, Injectable } from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';
import { DevicePlatform, NotificationDevice } from './notification-device.entity';
import { NotificationDeviceRepositoryPort } from './ports/notification-device.repository.port';

@Injectable()
export class NotificationDeviceService {
    private readonly LOGGER = getLogger(NotificationDeviceService.name);

    constructor(
        @Inject(NotificationDeviceRepositoryPort)
        private readonly repository: NotificationDeviceRepositoryPort
    ) {}

    /**
     * Register (or re-register) a device's push token for the user. Keyed on the
     * token, so the same device logging in again updates the existing row rather
     * than creating duplicates.
     */
    async register(
        userId: number,
        token: string,
        platform: DevicePlatform,
        deviceId?: string | null
    ): Promise<NotificationDevice> {
        const device = await this.repository.upsertByToken(
            new NotificationDevice({
                userId,
                token: token.trim(),
                platform,
                deviceId: deviceId?.trim() || null,
            })
        );
        this.LOGGER.debug(`Registered ${platform} device for user ${userId}.`);
        return device;
    }

    /** Unregister a device's push token (sign-out). Only removes the user's own token. */
    async unregister(userId: number, token: string): Promise<boolean> {
        const deleted = await this.repository.deleteByToken(token.trim(), userId);
        if (deleted) {
            this.LOGGER.debug(`Unregistered device for user ${userId}.`);
        }
        return deleted;
    }
}

import { validateInit } from 'src/core/validation.util';

export type DevicePlatform = 'ios' | 'android' | 'web';

/** A registered push-notification target (one per push token). */
export class NotificationDevice {
    readonly id: number | null;
    readonly userId: number;
    readonly token: string;
    readonly platform: DevicePlatform;
    readonly deviceId: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;

    constructor(init: Partial<NotificationDevice>) {
        validateInit(init, ['userId', 'token', 'platform']);
        this.id = init.id ?? null;
        this.userId = init.userId;
        this.token = init.token;
        this.platform = init.platform;
        this.deviceId = init.deviceId ?? null;
        this.createdAt = init.createdAt ?? new Date();
        this.updatedAt = init.updatedAt ?? new Date();
    }
}

import { NotificationDevice } from '../notification-device.entity';

export const NotificationDeviceRepositoryPort = 'NotificationDeviceRepositoryPort';

export interface NotificationDeviceRepositoryPort {
    /** Insert the device, or update user/platform/device_id when the token already exists. */
    upsertByToken(device: NotificationDevice): Promise<NotificationDevice>;
    /** All devices registered to a user (for fanning out a push). */
    findByUserId(userId: number): Promise<NotificationDevice[]>;
    /** Remove the token if it belongs to the user. Returns true when a row was deleted. */
    deleteByToken(token: string, userId: number): Promise<boolean>;
}

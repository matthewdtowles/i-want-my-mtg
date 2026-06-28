import { DevicePlatform, NotificationDevice } from 'src/core/notification-device/notification-device.entity';
import { NotificationDeviceOrmEntity } from './notification-device.orm-entity';

export class NotificationDeviceMapper {
    static toCore(orm: NotificationDeviceOrmEntity): NotificationDevice {
        return new NotificationDevice({
            id: orm.id,
            userId: orm.userId,
            token: orm.token,
            platform: orm.platform as DevicePlatform,
            deviceId: orm.deviceId,
            createdAt: orm.createdAt,
            updatedAt: orm.updatedAt,
        });
    }

    static toOrmEntity(core: NotificationDevice): NotificationDeviceOrmEntity {
        const orm = new NotificationDeviceOrmEntity();
        if (core.id !== null) orm.id = core.id;
        orm.userId = core.userId;
        orm.token = core.token;
        orm.platform = core.platform;
        orm.deviceId = core.deviceId;
        return orm;
    }
}

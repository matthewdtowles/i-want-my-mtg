import {
    PriceChangeDirection,
    PriceNotification,
} from 'src/core/price-alert/price-notification.entity';
import { PriceNotificationOrmEntity } from './price-notification.orm-entity';

export class PriceNotificationMapper {
    static toCore(orm: PriceNotificationOrmEntity): PriceNotification {
        return new PriceNotification({
            id: orm.id,
            userId: orm.userId,
            cardId: orm.cardId,
            alertId: orm.alertId,
            direction: orm.direction as PriceChangeDirection,
            oldPrice: Number(orm.oldPrice),
            newPrice: Number(orm.newPrice),
            changePct: Number(orm.changePct),
            isRead: orm.isRead,
            createdAt: orm.createdAt,
        });
    }

    static toOrmEntity(core: PriceNotification): PriceNotificationOrmEntity {
        const orm = new PriceNotificationOrmEntity();
        if (core.id) orm.id = core.id;
        orm.userId = core.userId;
        orm.cardId = core.cardId;
        orm.alertId = core.alertId;
        orm.direction = core.direction;
        orm.oldPrice = core.oldPrice;
        orm.newPrice = core.newPrice;
        orm.changePct = core.changePct;
        orm.isRead = core.isRead;
        orm.createdAt = core.createdAt;
        return orm;
    }
}

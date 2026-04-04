import { PriceAlert } from 'src/core/price-alert/price-alert.entity';
import { PriceAlertOrmEntity } from './price-alert.orm-entity';

export class PriceAlertMapper {
    static toCore(orm: PriceAlertOrmEntity): PriceAlert {
        return new PriceAlert({
            id: orm.id,
            userId: orm.userId,
            cardId: orm.cardId,
            increasePct: orm.increasePct != null ? Number(orm.increasePct) : null,
            decreasePct: orm.decreasePct != null ? Number(orm.decreasePct) : null,
            isActive: orm.isActive,
            lastNotifiedAt: orm.lastNotifiedAt,
            createdAt: orm.createdAt,
            updatedAt: orm.updatedAt,
        });
    }

    static toOrmEntity(core: PriceAlert): PriceAlertOrmEntity {
        const orm = new PriceAlertOrmEntity();
        if (core.id) orm.id = core.id;
        orm.userId = core.userId;
        orm.cardId = core.cardId;
        orm.increasePct = core.increasePct;
        orm.decreasePct = core.decreasePct;
        orm.isActive = core.isActive;
        orm.lastNotifiedAt = core.lastNotifiedAt;
        orm.createdAt = core.createdAt;
        orm.updatedAt = core.updatedAt;
        return orm;
    }
}

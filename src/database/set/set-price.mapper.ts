import { SetPrice } from 'src/core/set/set-price.entity';
import { SetPriceOrmEntity } from './set-price.orm-entity';

export class SetPriceMapper {
    static toCore(ormEntity: SetPriceOrmEntity): SetPrice {
        if (!ormEntity) return null;
        return new SetPrice({
            setCode: ormEntity.setCode,
            basePrice: ormEntity.basePrice != null ? Number(ormEntity.basePrice) : null,
            totalPrice: ormEntity.totalPrice != null ? Number(ormEntity.totalPrice) : null,
            basePriceAll: ormEntity.basePriceAll != null ? Number(ormEntity.basePriceAll) : null,
            totalPriceAll: ormEntity.totalPriceAll != null ? Number(ormEntity.totalPriceAll) : null,
            basePriceChangeWeekly: ormEntity.basePriceChangeWeekly != null ? Number(ormEntity.basePriceChangeWeekly) : null,
            totalPriceChangeWeekly: ormEntity.totalPriceChangeWeekly != null ? Number(ormEntity.totalPriceChangeWeekly) : null,
            basePriceAllChangeWeekly: ormEntity.basePriceAllChangeWeekly != null ? Number(ormEntity.basePriceAllChangeWeekly) : null,
            totalPriceAllChangeWeekly: ormEntity.totalPriceAllChangeWeekly != null ? Number(ormEntity.totalPriceAllChangeWeekly) : null,
            lastUpdate: ormEntity.lastUpdate,
        });
    }

    static toOrmEntity(coreEntity: SetPrice): SetPriceOrmEntity {
        if (!coreEntity) return null;
        const ormEntity = new SetPriceOrmEntity();
        ormEntity.setCode = coreEntity.setCode;
        ormEntity.basePrice = coreEntity.basePrice;
        ormEntity.totalPrice = coreEntity.totalPrice;
        ormEntity.basePriceAll = coreEntity.basePriceAll;
        ormEntity.totalPriceAll = coreEntity.totalPriceAll;
        ormEntity.lastUpdate = coreEntity.lastUpdate;
        return ormEntity;
    }
}

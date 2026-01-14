import { SetPrice } from "src/core/set/set-price.entity";
import { SetPriceOrmEntity } from "./set-price.orm-entity";

export class SetPriceMapper {
    static toCore(ormEntity: SetPriceOrmEntity): SetPrice {
        if (!ormEntity) return null;

        return new SetPrice({
            setCode: ormEntity.setCode,
            basePrice: ormEntity.basePrice,
            totalPrice: ormEntity.totalPrice,
            basePriceAll: ormEntity.basePriceAll,
            totalPriceAll: ormEntity.totalPriceAll,
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
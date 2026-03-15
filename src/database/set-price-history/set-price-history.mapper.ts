import { SetPriceHistory } from 'src/core/set/set-price-history.entity';
import { SetPriceHistoryOrmEntity } from './set-price-history.orm-entity';

export class SetPriceHistoryMapper {
    static toCore(ormEntity: SetPriceHistoryOrmEntity): SetPriceHistory {
        return new SetPriceHistory({
            id: ormEntity.id,
            setCode: ormEntity?.set?.code,
            basePrice: ormEntity.basePrice != null ? Number(ormEntity.basePrice) : null,
            totalPrice: ormEntity.totalPrice != null ? Number(ormEntity.totalPrice) : null,
            basePriceAll: ormEntity.basePriceAll != null ? Number(ormEntity.basePriceAll) : null,
            totalPriceAll: ormEntity.totalPriceAll != null ? Number(ormEntity.totalPriceAll) : null,
            date: ormEntity.date,
        });
    }
}

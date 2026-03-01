import { SetPriceHistory } from 'src/core/set/set-price-history.entity';
import { SetPriceHistoryOrmEntity } from './set-price-history.orm-entity';

export class SetPriceHistoryMapper {
    static toCore(ormEntity: SetPriceHistoryOrmEntity): SetPriceHistory {
        return new SetPriceHistory({
            id: ormEntity.id,
            setCode: ormEntity?.set?.code,
            basePrice: ormEntity.basePrice,
            totalPrice: ormEntity.totalPrice,
            basePriceAll: ormEntity.basePriceAll,
            totalPriceAll: ormEntity.totalPriceAll,
            date: ormEntity.date,
        });
    }
}

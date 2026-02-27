import { Price } from 'src/core/card/price.entity';
import { PriceHistoryOrmEntity } from './price-history.orm-entity';

export class PriceHistoryMapper {
    static toCore(ormEntity: PriceHistoryOrmEntity): Price {
        return new Price({
            id: ormEntity.id,
            cardId: ormEntity?.card?.id,
            foil: ormEntity.foil,
            normal: ormEntity.normal,
            date: ormEntity.date,
        });
    }
}

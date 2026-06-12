import { GranularPrice } from 'src/core/card/granular-price.entity';
import { GranularPriceOrmEntity } from './granular-price.orm-entity';

export class GranularPriceMapper {
    static toCore(orm: GranularPriceOrmEntity): GranularPrice {
        return new GranularPrice({
            cardId: orm.cardId,
            provider: orm.provider,
            priceType: orm.priceType,
            finish: orm.finish,
            condition: orm.condition,
            date: orm.date,
            price: orm.price != null ? Number(orm.price) : null,
            qty: orm.qty ?? null,
        });
    }
}

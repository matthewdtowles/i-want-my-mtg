import { Price } from "src/core/price";
import { PriceOrmEntity } from "src/infrastructure/database/price";

export class PriceMapper {
    static toCore(ormPrice: PriceOrmEntity): Price {
        return {
            id: ormPrice.id,
            cardId: ormPrice.card.id,
            foil: ormPrice.foil,
            normal: ormPrice.normal,
            date: ormPrice.date,

        };
    }
    static toOrmEntity(corePrice: Price): PriceOrmEntity {
        const ormEntity = new PriceOrmEntity();
        ormEntity.id = corePrice.id;
        ormEntity.card = { id: corePrice.cardId } as any;
        ormEntity.foil = corePrice.foil;
        ormEntity.normal = corePrice.normal;
        ormEntity.date = corePrice.date;
        return ormEntity;
    }
}
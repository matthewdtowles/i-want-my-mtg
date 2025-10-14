import { Price } from "src/core/price/price.entity";
import { CardOrmEntity } from "src/database/card/card.orm-entity";
import { PriceOrmEntity } from "./price.orm-entity";

export class PriceMapper {
    static toCore(ormPrice: PriceOrmEntity): Price {
        return new Price({
            id: ormPrice.id,
            cardId: ormPrice?.card?.id,
            foil: ormPrice.foil,
            normal: ormPrice.normal,
            date: ormPrice.date,
        });
    }

    static toOrmEntity(corePrice: Price): PriceOrmEntity {
        const ormEntity = new PriceOrmEntity();
        ormEntity.id = corePrice.id;
        ormEntity.card = { id: corePrice.cardId } as CardOrmEntity;
        ormEntity.foil = corePrice.foil;
        ormEntity.normal = corePrice.normal;
        ormEntity.date = corePrice.date;
        return ormEntity;
    }
}
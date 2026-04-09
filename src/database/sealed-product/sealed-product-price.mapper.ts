import { SealedProductPrice } from 'src/core/sealed-product/sealed-product-price.entity';
import { SealedProductPriceOrmEntity } from './sealed-product-price.orm-entity';

export class SealedProductPriceMapper {
    static toCore(orm: SealedProductPriceOrmEntity): SealedProductPrice {
        if (!orm) return null;
        return new SealedProductPrice({
            price: orm.price != null ? Number(orm.price) : null,
            priceChangeWeekly: orm.priceChangeWeekly != null ? Number(orm.priceChangeWeekly) : null,
            date: orm.date,
        });
    }

    static toOrmEntity(core: SealedProductPrice, uuid: string): SealedProductPriceOrmEntity {
        if (!core) return null;
        const orm = new SealedProductPriceOrmEntity();
        orm.sealedProductUuid = uuid;
        orm.price = core.price;
        orm.priceChangeWeekly = core.priceChangeWeekly;
        orm.date = core.date;
        return orm;
    }
}

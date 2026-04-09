import { SealedProduct } from 'src/core/sealed-product/sealed-product.entity';
import { SealedProductInventory } from 'src/core/sealed-product/sealed-product-inventory.entity';
import { SealedProductPriceMapper } from './sealed-product-price.mapper';
import { SealedProductOrmEntity } from './sealed-product.orm-entity';
import { SealedProductInventoryOrmEntity } from './sealed-product-inventory.orm-entity';

export class SealedProductMapper {
    static toCore(orm: SealedProductOrmEntity): SealedProduct {
        return new SealedProduct({
            uuid: orm.uuid,
            name: orm.name,
            setCode: orm.setCode,
            category: orm.category,
            subtype: orm.subtype,
            cardCount: orm.cardCount,
            productSize: orm.productSize,
            releaseDate: orm.releaseDate,
            contentsSummary: orm.contentsSummary,
            purchaseUrlTcgplayer: orm.purchaseUrlTcgplayer,
            price: orm.price ? SealedProductPriceMapper.toCore(orm.price) : undefined,
        });
    }

    static toOrmEntity(core: SealedProduct): SealedProductOrmEntity {
        const orm = new SealedProductOrmEntity();
        orm.uuid = core.uuid;
        orm.name = core.name;
        orm.setCode = core.setCode;
        orm.category = core.category;
        orm.subtype = core.subtype;
        orm.cardCount = core.cardCount;
        orm.productSize = core.productSize;
        orm.releaseDate = core.releaseDate;
        orm.contentsSummary = core.contentsSummary;
        orm.purchaseUrlTcgplayer = core.purchaseUrlTcgplayer;
        return orm;
    }

    static inventoryToCore(orm: SealedProductInventoryOrmEntity): SealedProductInventory {
        return new SealedProductInventory({
            sealedProductUuid: orm.sealedProductUuid,
            userId: orm.userId,
            quantity: orm.quantity,
            sealedProduct: orm.sealedProduct
                ? SealedProductMapper.toCore(orm.sealedProduct)
                : undefined,
        });
    }

    static inventoryToOrmEntity(core: SealedProductInventory): SealedProductInventoryOrmEntity {
        const orm = new SealedProductInventoryOrmEntity();
        orm.sealedProductUuid = core.sealedProductUuid;
        orm.userId = core.userId;
        orm.quantity = core.quantity;
        return orm;
    }
}

import { AffiliateLinkPolicy } from 'src/core/affiliate/affiliate-link.policy';
import { SealedProduct } from 'src/core/sealed-product/sealed-product.entity';
import { SealedProductInventory } from 'src/core/sealed-product/sealed-product-inventory.entity';
import {
    SealedProductApiResponseDto,
    SealedProductInventoryApiDto,
} from './dto/sealed-product-response.dto';

export class SealedProductApiPresenter {
    static toResponse(product: SealedProduct): SealedProductApiResponseDto {
        return {
            uuid: product.uuid,
            name: product.name,
            setCode: product.setCode,
            category: product.category,
            subtype: product.subtype,
            cardCount: product.cardCount,
            productSize: product.productSize,
            releaseDate: product.releaseDate,
            contentsSummary: product.contentsSummary,
            purchaseUrlTcgplayer: AffiliateLinkPolicy.wrapTcgplayer(product.purchaseUrlTcgplayer),
            tcgplayerProductId: product.tcgplayerProductId,
            price: product.price
                ? {
                      price: product.price.price,
                      priceChangeWeekly: product.price.priceChangeWeekly,
                      date: product.price.date,
                  }
                : undefined,
        };
    }

    static toInventoryResponse(item: SealedProductInventory): SealedProductInventoryApiDto {
        return {
            sealedProductUuid: item.sealedProductUuid,
            quantity: item.quantity,
            sealedProduct: item.sealedProduct
                ? SealedProductApiPresenter.toResponse(item.sealedProduct)
                : undefined,
        };
    }
}

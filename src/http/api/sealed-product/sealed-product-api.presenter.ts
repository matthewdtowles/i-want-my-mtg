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
            purchaseUrlTcgplayer: AffiliateLinkPolicy.buildTcgplayerLink(
                product.tcgplayerProductId
            ),
            tcgplayerProductId: product.tcgplayerProductId,
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

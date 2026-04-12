import { SealedProduct } from 'src/core/sealed-product/sealed-product.entity';
import { formatGain, gainSign, toDollar } from 'src/http/base/http.util';
import { SealedProductRowDto } from './dto/sealed-product-row.dto';

const TCGPLAYER_IMAGE_BASE = 'https://product-images.tcgplayer.com/fit-in';
const DETAIL_IMAGE_SIZE = '437x437';
const THUMBNAIL_SIZE = '200x200';

/**
 * Maps SealedProduct domain entities to the view DTOs consumed by both
 * the set page's sealed tab and the individual sealed product detail page.
 */
export class SealedProductHbsPresenter {
    static toRow(product: SealedProduct, ownedQuantity = 0): SealedProductRowDto {
        const priceRaw = product.price?.price ?? null;
        const hasPrice = priceRaw != null && priceRaw > 0;
        const priceChangeRaw = product.price?.priceChangeWeekly ?? null;
        const hasPriceChange = priceChangeRaw != null && priceChangeRaw !== 0;

        return new SealedProductRowDto({
            uuid: product.uuid,
            name: product.name,
            setCode: product.setCode,
            detailUrl: `/sealed-products/${product.uuid}`,
            category: product.category,
            categoryLabel: SealedProductHbsPresenter.toLabel(product.category),
            subtype: product.subtype,
            subtypeLabel: SealedProductHbsPresenter.toLabel(product.subtype),
            cardCount: product.cardCount,
            productSize: product.productSize,
            releaseDate: product.releaseDate,
            contentsSummary: product.contentsSummary,
            purchaseUrlTcgplayer: product.purchaseUrlTcgplayer,
            tcgplayerProductId: product.tcgplayerProductId,
            imageUrl: product.tcgplayerProductId
                ? `${TCGPLAYER_IMAGE_BASE}/${DETAIL_IMAGE_SIZE}/${encodeURIComponent(product.tcgplayerProductId)}.jpg`
                : undefined,
            thumbnailUrl: product.tcgplayerProductId
                ? `${TCGPLAYER_IMAGE_BASE}/${THUMBNAIL_SIZE}/${encodeURIComponent(product.tcgplayerProductId)}.jpg`
                : undefined,
            price: hasPrice ? toDollar(priceRaw) : undefined,
            priceRaw: hasPrice ? priceRaw : undefined,
            hasPrice,
            priceChangeWeekly: hasPriceChange ? formatGain(priceChangeRaw) : undefined,
            priceChangeWeeklySign: hasPriceChange ? gainSign(priceChangeRaw) : undefined,
            ownedQuantity,
        });
    }

    static toRows(
        products: SealedProduct[],
        ownedQuantities: Map<string, number> = new Map()
    ): SealedProductRowDto[] {
        return products.map((p) =>
            SealedProductHbsPresenter.toRow(p, ownedQuantities.get(p.uuid) ?? 0)
        );
    }

    /**
     * Converts API values like "booster_box" → "Booster Box" for display.
     */
    private static toLabel(value: string | undefined): string | undefined {
        if (!value) return undefined;
        return value
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }
}

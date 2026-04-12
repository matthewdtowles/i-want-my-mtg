/**
 * View model for a sealed product row on the set page's sealed tab
 * and for the header summary on the sealed product detail page.
 */
export class SealedProductRowDto {
    readonly uuid: string;
    readonly name: string;
    readonly setCode: string;
    readonly detailUrl: string;
    readonly category?: string;
    readonly categoryLabel?: string;
    readonly subtype?: string;
    readonly subtypeLabel?: string;
    readonly cardCount?: number;
    readonly productSize?: number;
    readonly releaseDate?: string;
    readonly contentsSummary?: string;
    readonly purchaseUrlTcgplayer?: string;
    readonly tcgplayerProductId?: string;
    readonly imageUrl?: string;
    readonly thumbnailUrl?: string;
    readonly price?: string;
    readonly priceRaw?: number;
    readonly hasPrice: boolean;
    readonly priceChangeWeekly?: string;
    readonly priceChangeWeeklySign?: string;
    readonly ownedQuantity: number;

    constructor(init: Partial<SealedProductRowDto>) {
        this.uuid = init.uuid;
        this.name = init.name;
        this.setCode = init.setCode;
        this.detailUrl = init.detailUrl;
        this.category = init.category;
        this.categoryLabel = init.categoryLabel;
        this.subtype = init.subtype;
        this.subtypeLabel = init.subtypeLabel;
        this.cardCount = init.cardCount;
        this.productSize = init.productSize;
        this.releaseDate = init.releaseDate;
        this.contentsSummary = init.contentsSummary;
        this.purchaseUrlTcgplayer = init.purchaseUrlTcgplayer;
        this.tcgplayerProductId = init.tcgplayerProductId;
        this.imageUrl = init.imageUrl;
        this.thumbnailUrl = init.thumbnailUrl;
        this.price = init.price;
        this.priceRaw = init.priceRaw;
        this.hasPrice = init.hasPrice ?? false;
        this.priceChangeWeekly = init.priceChangeWeekly;
        this.priceChangeWeeklySign = init.priceChangeWeeklySign;
        this.ownedQuantity = init.ownedQuantity ?? 0;
    }
}

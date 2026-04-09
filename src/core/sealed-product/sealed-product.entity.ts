import { validateInit } from 'src/core/validation.util';
import { SealedProductPrice } from './sealed-product-price.entity';

export class SealedProduct {
    readonly uuid: string;
    readonly name: string;
    readonly setCode: string;
    readonly category?: string;
    readonly subtype?: string;
    readonly cardCount?: number;
    readonly productSize?: number;
    readonly releaseDate?: string;
    readonly contentsSummary?: string;
    readonly purchaseUrlTcgplayer?: string;
    readonly price?: SealedProductPrice;

    constructor(init: Partial<SealedProduct>) {
        validateInit(init, ['uuid', 'name', 'setCode']);
        this.uuid = init.uuid;
        this.name = init.name;
        this.setCode = init.setCode;
        this.category = init.category;
        this.subtype = init.subtype;
        this.cardCount = init.cardCount;
        this.productSize = init.productSize;
        this.releaseDate = init.releaseDate;
        this.contentsSummary = init.contentsSummary;
        this.purchaseUrlTcgplayer = init.purchaseUrlTcgplayer;
        this.price = init.price;
    }
}

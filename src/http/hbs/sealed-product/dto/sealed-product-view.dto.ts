import { BaseViewDto } from 'src/http/base/base.view.dto';

export class SealedProductResponseDto {
    uuid: string;
    name: string;
    setCode: string;
    category?: string;
    subtype?: string;
    cardCount?: number;
    productSize?: number;
    releaseDate?: string;
    contentsSummary?: string;
    purchaseUrlTcgplayer?: string;
    price?: string;
    priceChangeWeekly?: string;
}

export class SealedProductDetailViewDto extends BaseViewDto {
    readonly product: SealedProductResponseDto;
    readonly setName?: string;
    readonly setKeyruneCode?: string;
    readonly inventoryQuantity?: number;

    constructor(init: Partial<SealedProductDetailViewDto>) {
        super(init);
        this.product = init.product;
        this.setName = init.setName;
        this.setKeyruneCode = init.setKeyruneCode;
        this.inventoryQuantity = init.inventoryQuantity ?? 0;
    }
}

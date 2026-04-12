import { BaseViewDto } from 'src/http/base/base.view.dto';
import { SealedProductRowDto } from './sealed-product-row.dto';

/**
 * View model for the sealed product detail page. The `product` field reuses
 * the same row DTO that powers the set page's sealed tab, so formatting
 * (labels, image URLs, price strings, sign) stays consistent across views.
 */
export class SealedProductDetailViewDto extends BaseViewDto {
    readonly product: SealedProductRowDto;
    readonly setName?: string;
    readonly setKeyruneCode?: string;

    constructor(init: Partial<SealedProductDetailViewDto>) {
        super(init);
        this.product = init.product;
        this.setName = init.setName;
        this.setKeyruneCode = init.setKeyruneCode;
    }
}

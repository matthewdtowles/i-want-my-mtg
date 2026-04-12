import { CardResponseDto } from 'src/http/hbs/card/dto/card.response.dto';
import { SealedProductRowDto } from 'src/http/hbs/sealed-product/dto/sealed-product-row.dto';
import { BaseSetResponseDto } from './base-set.response.dto';

// For set.hbs (setInfo.hbs)
export class SetResponseDto extends BaseSetResponseDto {
    readonly cards: CardResponseDto[];
    readonly sealedProducts: SealedProductRowDto[];

    constructor(init: Partial<SetResponseDto>) {
        super(init);
        this.cards = init.cards || [];
        this.sealedProducts = init.sealedProducts || [];
    }
}

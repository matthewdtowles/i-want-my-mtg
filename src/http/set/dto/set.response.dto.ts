import { CardResponseDto } from "src/http/card/dto/card.response.dto";
import { BaseSetResponseDto } from "./base-set.response.dto";
import { SetPriceDto } from "./set-price.dto";

// For set.hbs (setInfo.hbs)
export class SetResponseDto extends BaseSetResponseDto {
    readonly cards: CardResponseDto[];
    readonly prices?: SetPriceDto;
    readonly baseSize: number;
    readonly totalSize: number;

    constructor(init: Partial<SetResponseDto>) {
        super(init);
        this.cards = init.cards || [];
        this.prices = init.prices ?? new SetPriceDto({});
        this.baseSize = init.baseSize ?? 0;
        this.totalSize = init.totalSize ?? 0;
   }
}
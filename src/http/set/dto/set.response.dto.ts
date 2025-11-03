import { CardResponseDto } from "src/http/card/dto/card.response.dto";
import { BaseSetResponseDto } from "./base-set.response.dto";

// For set.hbs (setInfo.hbs)
export class SetResponseDto extends BaseSetResponseDto {
    readonly cards: CardResponseDto[];
    readonly ownedTotal: number
    readonly setSize: number

    constructor(init: Partial<SetResponseDto>) {
        super(init);
        this.cards = init.cards || [];
        this.ownedTotal = init.ownedTotal || 0;
        this.setSize = init.setSize || this.cards?.length || 0;
    }
}
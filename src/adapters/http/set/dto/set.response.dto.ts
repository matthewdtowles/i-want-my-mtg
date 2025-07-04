import { CardResponseDto } from "src/adapters/http/card/dto/card.response.dto";
import { BaseSetResponseDto } from "src/adapters/http/set/dto/base-set.response.dto";

// For set.hbs (setInfo.hbs)
export class SetResponseDto extends BaseSetResponseDto {
    readonly cards: CardResponseDto[];

    constructor(init: Partial<SetResponseDto>) {
        super(init);
        this.cards = init.cards || [];
    }
}
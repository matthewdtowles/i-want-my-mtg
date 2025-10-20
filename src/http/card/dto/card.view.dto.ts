import { ListView } from "src/http/list/list.view";
import { CardResponseDto } from "./card.response.dto";
import { SingleCardResponseDto } from "./single-card.response.dto";

export class CardViewDto extends ListView {
    readonly card: SingleCardResponseDto;
    readonly otherPrintings: CardResponseDto[];

    constructor(init: Partial<CardViewDto>) {
        super(init);
        this.card = init.card;
        this.otherPrintings = init.otherPrintings || [];
    }
}
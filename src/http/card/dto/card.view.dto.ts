import { BaseViewDto } from "src/http/base/base.view.dto";
import { PaginationDto } from "src/http/query/pagination.dto";
import { CardResponseDto } from "./card.response.dto";
import { SingleCardResponseDto } from "./single-card.response.dto";

export class CardViewDto extends BaseViewDto {
    readonly card: SingleCardResponseDto;
    readonly otherPrintings: CardResponseDto[];
    readonly pagination?: PaginationDto;

    constructor(init: Partial<CardViewDto>) {
        super(init);
        this.card = init.card;
        this.otherPrintings = init.otherPrintings || [];
        this.pagination = init.pagination;
    }
}
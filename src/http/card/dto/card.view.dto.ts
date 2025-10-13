import { BaseViewDto } from "src/http/base.view.dto";
import { CardResponseDto } from "src/http/card/dto/card.response.dto";
import { SingleCardResponseDto } from "src/http/card/dto/single-card.response.dto";
import { PaginationDto } from "src/http/pagination.dto";

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
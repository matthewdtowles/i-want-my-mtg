import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { CardResponseDto } from "src/adapters/http/card/dto/card.response.dto";
import { SingleCardResponseDto } from "src/adapters/http/card/dto/single-card.response.dto";

export class CardViewDto extends BaseViewDto {
    readonly card: SingleCardResponseDto;
    readonly otherPrintings: CardResponseDto[];
}
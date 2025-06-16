import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { CardResponseDto } from "src/adapters/http/card/dto/card.response.dto";
import { InventoryCardResponseDto } from "src/adapters/http/inventory/inventory.response.dto";

export class CardViewDto extends BaseViewDto {
    readonly card: CardResponseDto;
    readonly otherPrintings: InventoryCardResponseDto[];
}
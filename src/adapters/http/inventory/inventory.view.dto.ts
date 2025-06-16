import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { InventoryCardResponseDto } from "src/adapters/http/inventory/inventory.response.dto";

export class InventoryViewDto extends BaseViewDto {
    readonly cards: InventoryCardResponseDto[];
    readonly username: string;
    readonly totalValue: string;
}
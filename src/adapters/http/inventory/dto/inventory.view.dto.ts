import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { InventoryResponseDto } from "src/adapters/http/inventory/dto/inventory.response.dto";


export class InventoryViewDto extends BaseViewDto {
    readonly cards: InventoryResponseDto[];
    readonly username: string;
    readonly totalValue: string;
}
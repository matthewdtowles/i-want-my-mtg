import { BaseViewDto } from "src/http/base.view.dto";
import { InventoryResponseDto } from "src/http/inventory/dto/inventory.response.dto";


export class InventoryViewDto extends BaseViewDto {
    readonly cards: InventoryResponseDto[];
    readonly username: string;
    readonly totalValue: string;

    constructor(init: Partial<InventoryViewDto>) {
        super(init);
        this.cards = init.cards || [];
        this.username = init.username || "";
        this.totalValue = init.totalValue || "0.00";
    }
}
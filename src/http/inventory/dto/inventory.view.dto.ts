import { ListViewDto } from "src/http/list/list.view.dto";
import { InventoryResponseDto } from "./inventory.response.dto";


export class InventoryViewDto extends ListViewDto {
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
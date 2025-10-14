import { BaseViewDto } from "src/http/base/base.view.dto";
import { PaginationDto } from "src/http/query/pagination.dto";
import { InventoryResponseDto } from "./inventory.response.dto";


export class InventoryViewDto extends BaseViewDto {
    readonly cards: InventoryResponseDto[];
    readonly username: string;
    readonly totalValue: string;
    readonly pagination?: PaginationDto;

    constructor(init: Partial<InventoryViewDto>) {
        super(init);
        this.cards = init.cards || [];
        this.username = init.username || "";
        this.totalValue = init.totalValue || "0.00";
        this.pagination = init.pagination;
    }
}
import { BaseViewDto } from "src/http/base/base.view.dto";
import { FilterResponseDto } from "./filter.response.dto";
import { PaginationResponseDto } from "./pagination.response.dto";
import { SortResponseDto } from "./sort.response.dto";

export class ListViewDto extends BaseViewDto {
    readonly pagination?: PaginationResponseDto;
    readonly filter?: FilterResponseDto;
    readonly sort?: SortResponseDto;

    constructor(init: Partial<ListViewDto>) {
        super(init);
        this.pagination = init.pagination;
        this.filter = init.filter;
        this.sort = init.sort;
    }
}
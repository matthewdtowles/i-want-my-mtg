import { BaseViewDto } from "src/http/base/base.view.dto";
import { FilterResponseDto } from "src/http/list/filter.response.dto";
import { PaginationResponseDto } from "src/http/list/pagination.response.dto";
import { SortResponseDto } from "src/http/list/sort.response.dto";
import { SetMetaResponseDto } from "./set-meta.response.dto";

export class SetListViewDto extends BaseViewDto {
    readonly setList: SetMetaResponseDto[];
    readonly pagination?: PaginationResponseDto;
    readonly filter?: FilterResponseDto;
    readonly sort?: SortResponseDto;

    constructor(init: Partial<SetListViewDto>) {
        super(init);
        this.setList = init.setList || [];
        this.pagination = init.pagination;
    }
}
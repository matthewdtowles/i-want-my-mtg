import { BaseViewDto } from "src/http/base/base.view.dto";
import { PaginationDto } from "src/http/query/pagination.dto";
import { SetMetaResponseDto } from "./set-meta.response.dto";

export class SetListViewDto extends BaseViewDto {
    readonly setList: SetMetaResponseDto[];
    readonly pagination?: PaginationDto;

    constructor(init: Partial<SetListViewDto>) {
        super(init);
        this.setList = init.setList || [];
        this.pagination = init.pagination;
    }
}
import { BaseViewDto } from "src/http/base.view.dto";
import { PaginationDto } from "src/http/pagination.dto";
import { SetResponseDto } from "./set.response.dto";

export class SetViewDto extends BaseViewDto {
    readonly set: SetResponseDto;
    readonly pagination?: PaginationDto;

    constructor(init: Partial<SetViewDto>) {
        super(init);
        this.set = init.set;
        this.pagination = init.pagination;
    }
}
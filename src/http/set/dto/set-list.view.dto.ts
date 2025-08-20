import { BaseViewDto } from "src/http/base.view.dto";
import { SetMetaResponseDto } from "src/http/set/dto/set-meta.response.dto";

export class SetListViewDto extends BaseViewDto {
    readonly setList: SetMetaResponseDto[];

    constructor(init: Partial<SetListViewDto>) {
        super(init);
        this.setList = init.setList || [];
    }
}
import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { SetMetaResponseDto } from "src/adapters/http/set/dto/set-meta.response.dto";

export class SetListViewDto extends BaseViewDto {
    readonly setList: SetMetaResponseDto[];

    constructor(init: Partial<SetListViewDto>) {
        super(init);
        this.setList = init.setList || [];
    }
}
import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { SetMetaDto } from "src/adapters/http/set/set-meta.dto";

export class SetListViewDto extends BaseViewDto {
    readonly setList: SetMetaDto[];

    constructor(init: Partial<SetListViewDto>) {
        super(init);
        this.setList = init.setList || [];
    }
}
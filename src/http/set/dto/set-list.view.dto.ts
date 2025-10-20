import { ListView } from "src/http/list/list.view";
import { SetMetaResponseDto } from "./set-meta.response.dto";

export class SetListViewDto extends ListView {
    readonly setList: SetMetaResponseDto[];

    constructor(init: Partial<SetListViewDto>) {
        super(init);
        this.setList = init.setList || [];
    }
}
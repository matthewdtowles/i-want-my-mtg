import { ListViewDto } from "src/http/list/list.view.dto";
import { SetMetaResponseDto } from "./set-meta.response.dto";

export class SetListViewDto extends ListViewDto {
    readonly setList: SetMetaResponseDto[];

    constructor(init: Partial<SetListViewDto>) {
        super(init);
        this.setList = init.setList || [];
    }
}
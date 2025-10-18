import { ListViewDto } from "src/http/list/list.view.dto";
import { SetResponseDto } from "./set.response.dto";

export class SetViewDto extends ListViewDto {
    readonly set: SetResponseDto;

    constructor(init: Partial<SetViewDto>) {
        super(init);
        this.set = init.set;
    }
}
import { BaseViewDto } from "src/http/base.view.dto";
import { SetResponseDto } from "src/http/set/dto/set.response.dto";

export class SetViewDto extends BaseViewDto {
    readonly set: SetResponseDto;

    constructor(init: Partial<SetViewDto>) {
        super(init);
        this.set = init.set;
    }
}
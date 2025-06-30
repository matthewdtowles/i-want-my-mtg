import { BaseViewDto } from "src/adapters/http/base.view.dto";
import { SetResponseDto } from "src/adapters/http/set/dto/set.response.dto";

export class SetViewDto extends BaseViewDto {
    readonly set: SetResponseDto;

    constructor(init: Partial<SetViewDto>) {
        super(init);
        this.set = init.set;
    }
}
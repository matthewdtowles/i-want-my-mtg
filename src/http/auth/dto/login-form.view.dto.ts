import { BaseViewDto } from "src/http/base/base.view.dto";

export class LoginFormViewDto extends BaseViewDto {
    readonly email: string;

    constructor(init: Partial<LoginFormViewDto> = {}) {
        super(init);
        this.email = init.email || "";
    }
}
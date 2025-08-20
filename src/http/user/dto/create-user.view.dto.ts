import { BaseViewDto } from "src/http/base.view.dto";

export class CreateUserViewDto extends BaseViewDto {
    readonly name: string;
    readonly email: string;

    constructor(init: Partial<CreateUserViewDto> = {}) {
        super(init);
        this.name = init.name || "";
        this.email = init.email || "";
    }
}
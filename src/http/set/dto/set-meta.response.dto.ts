import { BaseSetResponseDto } from "./base-set.response.dto";

// For setListPage.hbs
export class SetMetaResponseDto extends BaseSetResponseDto {

    // readonly
    constructor(init: Partial<SetMetaResponseDto>) {
        super(init);
    }
}
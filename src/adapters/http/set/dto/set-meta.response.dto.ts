import { BaseSetResponseDto } from "src/adapters/http/set/dto/base-set.response.dto";

// For setListPage.hbs
export class SetMetaResponseDto extends BaseSetResponseDto {
    constructor(init: Partial<SetMetaResponseDto>) {
        super(init);
    }
}
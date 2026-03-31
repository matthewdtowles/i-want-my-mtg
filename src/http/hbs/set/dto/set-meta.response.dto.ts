import { BaseSetResponseDto } from './base-set.response.dto';

// For setListPage.hbs
export class SetMetaResponseDto extends BaseSetResponseDto {
    readonly isBlockChild: boolean;

    constructor(init: Partial<SetMetaResponseDto>) {
        super(init);
        this.isBlockChild = init.isBlockChild ?? false;
    }
}

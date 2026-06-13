import { BaseViewDto } from 'src/http/base/base.view.dto';

export class BuyListViewDto extends BaseViewDto {
    readonly hasItems: boolean;

    constructor(init: Partial<BuyListViewDto>) {
        super(init);
        this.hasItems = init.hasItems || false;
    }
}

import { BaseViewDto } from 'src/http/base/base.view.dto';

export class PriceAlertListViewDto extends BaseViewDto {
    readonly hasAlerts: boolean;

    constructor(init: Partial<PriceAlertListViewDto>) {
        super(init);
        this.hasAlerts = init.hasAlerts || false;
    }
}

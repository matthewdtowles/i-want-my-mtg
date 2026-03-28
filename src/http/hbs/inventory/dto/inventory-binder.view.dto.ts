import { BaseViewDto } from 'src/http/base/base.view.dto';

export class InventoryBinderViewDto extends BaseViewDto {
    readonly setCode: string;
    readonly setName: string;
    readonly ownedTotal: number;
    readonly cardTotal: number;
    readonly completionRate: number;
    readonly ownedValue: string;

    constructor(init: Partial<InventoryBinderViewDto>) {
        super(init);
        this.setCode = init.setCode || '';
        this.setName = init.setName || '';
        this.ownedTotal = init.ownedTotal || 0;
        this.cardTotal = init.cardTotal || 0;
        this.completionRate = init.completionRate || 0;
        this.ownedValue = init.ownedValue || '$0.00';
    }
}

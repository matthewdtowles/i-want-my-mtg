import { BaseViewDto } from 'src/http/base/base.view.dto';

export interface PricingDisplay {
    monthly: { amount: string; label: string };
    annual: { amount: string; label: string };
}

export class PricingViewDto extends BaseViewDto {
    readonly pricing: PricingDisplay;

    constructor(init: Partial<PricingViewDto>) {
        super(init);
        this.pricing = init.pricing ?? {
            monthly: { amount: '$3.99', label: 'per month' },
            annual: { amount: '$39.99', label: 'per year' },
        };
    }
}

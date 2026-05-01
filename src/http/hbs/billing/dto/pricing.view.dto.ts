import { BaseViewDto } from 'src/http/base/base.view.dto';

export interface PricingDisplay {
    monthly: { amount: string; label: string; amountValue: string };
    annual: {
        amount: string;
        label: string;
        amountValue: string;
        perMonth: string;
        billedNote: string;
    };
    annualMonthlyTotal: string;
}

const DEFAULT_PRICING: PricingDisplay = {
    monthly: { amount: '$3.99', label: 'per month', amountValue: '3.99' },
    annual: {
        amount: '$39.99',
        label: 'per year',
        amountValue: '39.99',
        perMonth: '3.33',
        billedNote: 'Billed $39.99/year - save ~2 months',
    },
    annualMonthlyTotal: '47.88',
};

export class PricingViewDto extends BaseViewDto {
    readonly pricing: PricingDisplay;

    constructor(init: Partial<PricingViewDto>) {
        super(init);
        this.pricing = init.pricing ?? DEFAULT_PRICING;
    }
}

export { DEFAULT_PRICING };

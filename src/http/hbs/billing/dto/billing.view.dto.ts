import { BaseViewDto } from 'src/http/base/base.view.dto';

export interface SubscriptionSummary {
    status: string;
    plan: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    isActive: boolean;
}

export type BillingNoticeType = 'success' | 'info' | 'error';

export interface BillingNotice {
    type: BillingNoticeType;
    message: string;
}

export class BillingViewDto extends BaseViewDto {
    readonly subscription: SubscriptionSummary | null;
    readonly notice: BillingNotice | null;
    readonly pricing: {
        monthly: { amount: string; label: string };
        annual: { amount: string; label: string };
    };

    constructor(init: Partial<BillingViewDto>) {
        super(init);
        this.subscription = init.subscription ?? null;
        this.notice = init.notice ?? null;
        this.pricing = init.pricing ?? {
            monthly: { amount: '$4.99', label: 'per month' },
            annual: { amount: '$49.99', label: 'per year' },
        };
    }
}

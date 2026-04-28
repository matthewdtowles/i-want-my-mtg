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

    constructor(init: Partial<BillingViewDto>) {
        super(init);
        this.subscription = init.subscription ?? null;
        this.notice = init.notice ?? null;
    }
}

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { PricingDisplay, PricingViewDto } from './dto/pricing.view.dto';

@Injectable()
export class PricingOrchestrator {
    private readonly appUrl: string;
    private readonly breadcrumbs = [
        { label: 'Home', url: '/' },
        { label: 'Pricing', url: '/pricing' },
    ];

    constructor(
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService,
        private readonly configService: ConfigService
    ) {
        this.appUrl = this.configService.get<string>('APP_URL', 'http://localhost:3000');
    }

    async getPricingView(req: AuthenticatedRequest): Promise<PricingViewDto> {
        const authenticated = !!req.user;
        const subscribed = authenticated
            ? await this.subscriptionService.isUserSubscribed(req.user.id)
            : false;
        return new PricingViewDto({
            authenticated,
            subscribed,
            indexable: true,
            title: 'Pricing - I Want My MTG',
            metaDescription:
                'Free forever for the essentials. Upgrade to Premium for unlimited alerts, full transaction history, and advanced portfolio analytics.',
            canonicalUrl: `${this.appUrl}/pricing`,
            breadcrumbs: this.breadcrumbs,
            pricing: this.pricingDisplay(),
        });
    }

    pricingDisplay(): PricingDisplay {
        const monthlyAmount =
            this.configService.get<string>('STRIPE_DISPLAY_PRICE_MONTHLY') || '$3.99';
        const annualAmount =
            this.configService.get<string>('STRIPE_DISPLAY_PRICE_ANNUAL') || '$39.99';
        const monthlyValue = parsePriceValue(monthlyAmount);
        const annualValue = parsePriceValue(annualAmount);
        const perMonth = (annualValue / 12).toFixed(2);
        const annualMonthlyTotal = (monthlyValue * 12).toFixed(2);
        return {
            monthly: {
                amount: monthlyAmount,
                label: 'per month',
                amountValue: monthlyValue.toFixed(2),
            },
            annual: {
                amount: annualAmount,
                label: 'per year',
                amountValue: annualValue.toFixed(2),
                perMonth,
                billedNote: `Billed ${annualAmount}/year - save ~2 months`,
            },
            annualMonthlyTotal,
        };
    }
}

function parsePriceValue(displayAmount: string): number {
    const parsed = parseFloat(displayAmount.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
}

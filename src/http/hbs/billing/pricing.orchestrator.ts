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
        return {
            monthly: {
                amount: this.configService.get<string>('STRIPE_DISPLAY_PRICE_MONTHLY') || '$3.99',
                label: 'per month',
            },
            annual: {
                amount: this.configService.get<string>('STRIPE_DISPLAY_PRICE_ANNUAL') || '$39.99',
                label: 'per year',
            },
        };
    }
}

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { PricingOrchestrator } from 'src/http/hbs/billing/pricing.orchestrator';

describe('PricingOrchestrator', () => {
    let subscriptionService: jest.Mocked<SubscriptionService>;

    const authedReq = { user: { id: 1 } } as AuthenticatedRequest;
    const anonReq = { user: null } as unknown as AuthenticatedRequest;

    /** Config values are read in the constructor, so each case builds its own instance. */
    async function build(config: Record<string, string> = {}): Promise<PricingOrchestrator> {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PricingOrchestrator,
                {
                    provide: SubscriptionService,
                    useValue: { isUserSubscribed: jest.fn().mockResolvedValue(false) },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string, fallback?: string) => config[key] ?? fallback),
                    },
                },
            ],
        }).compile();

        subscriptionService = module.get(SubscriptionService);
        return module.get(PricingOrchestrator);
    }

    describe('getPricingView', () => {
        it('builds an indexable view with a canonical URL from APP_URL', async () => {
            const orchestrator = await build({ APP_URL: 'https://iwantmymtg.com' });

            const view = await orchestrator.getPricingView(anonReq);

            expect(view.authenticated).toBe(false);
            expect(view.subscribed).toBe(false);
            expect(view.indexable).toBe(true);
            expect(view.title).toBe('Pricing - I Want My MTG');
            expect(view.canonicalUrl).toBe('https://iwantmymtg.com/pricing');
            expect(view.breadcrumbs).toEqual([
                { label: 'Home', url: '/' },
                { label: 'Pricing', url: '/pricing' },
            ]);
        });

        it('does not check subscription status for an anonymous visitor', async () => {
            const orchestrator = await build();

            await orchestrator.getPricingView(anonReq);

            expect(subscriptionService.isUserSubscribed).not.toHaveBeenCalled();
        });

        it('reflects the subscription status of a signed-in user', async () => {
            const orchestrator = await build();
            subscriptionService.isUserSubscribed.mockResolvedValue(true);

            const view = await orchestrator.getPricingView(authedReq);

            expect(subscriptionService.isUserSubscribed).toHaveBeenCalledWith(1);
            expect(view.authenticated).toBe(true);
            expect(view.subscribed).toBe(true);
        });
    });

    describe('pricingDisplay', () => {
        it('derives per-month and comparison figures from the configured amounts', async () => {
            const orchestrator = await build({
                STRIPE_DISPLAY_PRICE_MONTHLY: '$5.00',
                STRIPE_DISPLAY_PRICE_ANNUAL: '$48.00',
            });

            expect(orchestrator.pricingDisplay()).toEqual({
                monthly: { amount: '$5.00', label: 'per month', amountValue: '5.00' },
                annual: {
                    amount: '$48.00',
                    label: 'per year',
                    amountValue: '48.00',
                    perMonth: '4.00',
                    billedNote: 'Billed $48.00/year - save ~2 months',
                },
                annualMonthlyTotal: '60.00',
            });
        });

        it('falls back to the default amounts when the config is unset', async () => {
            const orchestrator = await build();

            const pricing = orchestrator.pricingDisplay();

            expect(pricing.monthly.amount).toBe('$3.99');
            expect(pricing.annual.amount).toBe('$39.99');
            expect(pricing.annual.perMonth).toBe('3.33');
            expect(pricing.annualMonthlyTotal).toBe('47.88');
        });

        it('treats an unparseable amount as zero rather than NaN', async () => {
            const orchestrator = await build({ STRIPE_DISPLAY_PRICE_ANNUAL: 'free' });

            const pricing = orchestrator.pricingDisplay();

            expect(pricing.annual.amountValue).toBe('0.00');
            expect(pricing.annual.perMonth).toBe('0.00');
        });
    });
});

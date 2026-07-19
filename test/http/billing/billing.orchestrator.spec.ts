import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionPlan } from 'src/core/billing/subscription-plan.enum';
import { SubscriptionStatus } from 'src/core/billing/subscription-status.enum';
import { Subscription } from 'src/core/billing/subscription.entity';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { User } from 'src/core/user/user.entity';
import { UserService } from 'src/core/user/user.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { BillingOrchestrator } from 'src/http/hbs/billing/billing.orchestrator';

describe('BillingOrchestrator', () => {
    let orchestrator: BillingOrchestrator;
    let subscriptionService: jest.Mocked<SubscriptionService>;
    let userService: jest.Mocked<UserService>;

    const req = {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isAuthenticated: () => true,
    } as AuthenticatedRequest;

    const activeSub = new Subscription({
        id: 10,
        userId: 1,
        stripeCustomerId: 'cus_1',
        status: SubscriptionStatus.Active,
        plan: SubscriptionPlan.Annual,
        currentPeriodEnd: new Date('2026-03-05T00:00:00Z'),
        cancelAtPeriodEnd: true,
    });

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BillingOrchestrator,
                {
                    provide: SubscriptionService,
                    useValue: {
                        getSubscriptionForUser: jest.fn(),
                        startCheckout: jest.fn(),
                        startBillingPortal: jest.fn(),
                        syncFromCheckoutSessionId: jest.fn(),
                    },
                },
                { provide: UserService, useValue: { findById: jest.fn() } },
            ],
        }).compile();

        orchestrator = module.get(BillingOrchestrator);
        subscriptionService = module.get(SubscriptionService);
        userService = module.get(UserService);
    });

    beforeEach(() => jest.clearAllMocks());

    describe('getBillingView', () => {
        it('summarizes an active subscription with a UTC-formatted period end', async () => {
            subscriptionService.getSubscriptionForUser.mockResolvedValue(activeSub);

            const view = await orchestrator.getBillingView(req);

            expect(subscriptionService.getSubscriptionForUser).toHaveBeenCalledWith(1);
            expect(view.subscribed).toBe(true);
            expect(view.indexable).toBe(false);
            expect(view.title).toBe('Subscription - I Want My MTG');
            expect(view.subscription).toEqual({
                status: SubscriptionStatus.Active,
                plan: SubscriptionPlan.Annual,
                currentPeriodEnd: 'March 5, 2026',
                cancelAtPeriodEnd: true,
                isActive: true,
            });
        });

        it('returns a null summary when the user has no subscription', async () => {
            subscriptionService.getSubscriptionForUser.mockResolvedValue(null);

            const view = await orchestrator.getBillingView(req);

            expect(view.subscription).toBeNull();
            expect(view.subscribed).toBe(false);
        });

        it('reports not subscribed for a canceled subscription', async () => {
            subscriptionService.getSubscriptionForUser.mockResolvedValue(
                new Subscription({
                    userId: 1,
                    stripeCustomerId: 'cus_1',
                    status: SubscriptionStatus.Canceled,
                })
            );

            const view = await orchestrator.getBillingView(req);

            expect(view.subscribed).toBe(false);
            expect(view.subscription.isActive).toBe(false);
            expect(view.subscription.currentPeriodEnd).toBeNull();
        });
    });

    describe('checkout and portal', () => {
        const user = { id: 1, email: 'test@example.com' } as User;

        it('loads the user before starting checkout', async () => {
            userService.findById.mockResolvedValue(user);
            subscriptionService.startCheckout.mockResolvedValue({ url: 'https://checkout' });

            await expect(
                orchestrator.startCheckout(req, SubscriptionPlan.Monthly)
            ).resolves.toEqual({ url: 'https://checkout' });
            expect(subscriptionService.startCheckout).toHaveBeenCalledWith(
                user,
                SubscriptionPlan.Monthly
            );
        });

        it('loads the user before starting the billing portal', async () => {
            userService.findById.mockResolvedValue(user);
            subscriptionService.startBillingPortal.mockResolvedValue({ url: 'https://portal' });

            await expect(orchestrator.startBillingPortal(req)).resolves.toEqual({
                url: 'https://portal',
            });
            expect(subscriptionService.startBillingPortal).toHaveBeenCalledWith(user);
        });

        it('throws when the request user no longer exists', async () => {
            userService.findById.mockResolvedValue(null);

            await expect(orchestrator.startCheckout(req, SubscriptionPlan.Monthly)).rejects.toThrow(
                'User 1 not found.'
            );
            expect(subscriptionService.startCheckout).not.toHaveBeenCalled();
        });
    });

    it('delegates checkout-session sync with the session id and user id', async () => {
        subscriptionService.syncFromCheckoutSessionId.mockResolvedValue(true);

        await expect(orchestrator.syncFromCheckoutSession(req, 'cs_123')).resolves.toBe(true);
        expect(subscriptionService.syncFromCheckoutSessionId).toHaveBeenCalledWith('cs_123', 1);
    });
});

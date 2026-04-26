import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AlreadySubscribedError } from 'src/core/billing/already-subscribed.error';
import type { Stripe } from 'src/core/billing/stripe.types';
import { SubscriptionRepositoryPort } from 'src/core/billing/ports/subscription.repository.port';
import { StripeGatewayPort } from 'src/core/billing/ports/stripe-gateway.port';
import { SubscriptionPlan } from 'src/core/billing/subscription-plan.enum';
import { SubscriptionStatus } from 'src/core/billing/subscription-status.enum';
import { Subscription } from 'src/core/billing/subscription.entity';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { User } from 'src/core/user/user.entity';
import { UserRole } from 'src/shared/constants/user.role.enum';

describe('SubscriptionService', () => {
    let service: SubscriptionService;
    let repo: jest.Mocked<SubscriptionRepositoryPort>;
    let gateway: jest.Mocked<StripeGatewayPort>;

    const user = new User({
        id: 42,
        name: 'Tester',
        email: 'test@example.com',
        role: UserRole.User,
    });

    beforeEach(async () => {
        repo = {
            findByUserId: jest.fn(),
            findByStripeCustomerId: jest.fn(),
            findByStripeSubscriptionId: jest.fn(),
            upsert: jest.fn().mockImplementation(async (s: Subscription) => s),
            deleteByUserId: jest.fn(),
        };
        gateway = {
            createCustomer: jest.fn(),
            createCheckoutSession: jest.fn(),
            createBillingPortalSession: jest.fn(),
            retrieveSubscription: jest.fn(),
            constructEvent: jest.fn(),
            priceIdForPlan: jest.fn().mockImplementation((p) => `price_${p}`),
            planForPriceId: jest.fn().mockImplementation((id) => {
                if (id === 'price_monthly') return SubscriptionPlan.Monthly;
                if (id === 'price_annual') return SubscriptionPlan.Annual;
                return null;
            }),
        };
        const config = {
            get: jest.fn((key: string) => {
                const values: Record<string, string> = {
                    APP_URL: 'http://localhost:3000',
                };
                return values[key];
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SubscriptionService,
                { provide: SubscriptionRepositoryPort, useValue: repo },
                { provide: StripeGatewayPort, useValue: gateway },
                { provide: ConfigService, useValue: config },
            ],
        }).compile();

        service = module.get(SubscriptionService);
    });

    describe('getOrCreateCustomer', () => {
        it('returns existing customer id when subscription exists', async () => {
            repo.findByUserId.mockResolvedValue(
                new Subscription({
                    userId: user.id,
                    stripeCustomerId: 'cus_existing',
                    status: SubscriptionStatus.Active,
                })
            );
            await expect(service.getOrCreateCustomer(user)).resolves.toBe('cus_existing');
            expect(gateway.createCustomer).not.toHaveBeenCalled();
        });

        it('creates Stripe customer and persists when none exists', async () => {
            repo.findByUserId.mockResolvedValue(null);
            gateway.createCustomer.mockResolvedValue('cus_new');
            await expect(service.getOrCreateCustomer(user)).resolves.toBe('cus_new');
            expect(gateway.createCustomer).toHaveBeenCalledWith({
                email: user.email,
                name: user.name,
                userId: user.id,
            });
            expect(repo.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: user.id,
                    stripeCustomerId: 'cus_new',
                    status: SubscriptionStatus.Incomplete,
                })
            );
        });
    });

    describe('startCheckout', () => {
        it('creates checkout session for monthly plan with returned URL', async () => {
            repo.findByUserId.mockResolvedValue(null);
            gateway.createCustomer.mockResolvedValue('cus_1');
            gateway.createCheckoutSession.mockResolvedValue({
                url: 'https://checkout.stripe/test',
            });

            const result = await service.startCheckout(user, SubscriptionPlan.Monthly);

            expect(result.url).toBe('https://checkout.stripe/test');
            expect(gateway.createCheckoutSession).toHaveBeenCalledWith(
                expect.objectContaining({
                    customerId: 'cus_1',
                    plan: SubscriptionPlan.Monthly,
                })
            );
        });

        it.each([
            SubscriptionStatus.Active,
            SubscriptionStatus.Trialing,
            SubscriptionStatus.PastDue,
            SubscriptionStatus.Unpaid,
        ])('throws AlreadySubscribedError when status is %s', async (status) => {
            repo.findByUserId.mockResolvedValue(
                new Subscription({
                    userId: user.id,
                    stripeCustomerId: 'cus_existing',
                    status,
                })
            );
            await expect(service.startCheckout(user, SubscriptionPlan.Monthly)).rejects.toBeInstanceOf(
                AlreadySubscribedError
            );
            expect(gateway.createCheckoutSession).not.toHaveBeenCalled();
        });

        it.each([
            SubscriptionStatus.Canceled,
            SubscriptionStatus.Incomplete,
            SubscriptionStatus.IncompleteExpired,
        ])('allows new checkout when prior status is %s', async (status) => {
            repo.findByUserId.mockResolvedValue(
                new Subscription({
                    userId: user.id,
                    stripeCustomerId: 'cus_existing',
                    status,
                })
            );
            gateway.createCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe/resubscribe' });
            const result = await service.startCheckout(user, SubscriptionPlan.Monthly);
            expect(result.url).toBe('https://checkout.stripe/resubscribe');
        });
    });

    describe('startBillingPortal', () => {
        it('throws when user has no Stripe customer yet', async () => {
            repo.findByUserId.mockResolvedValue(null);
            await expect(service.startBillingPortal(user)).rejects.toThrow(/no subscription/i);
        });

        it('creates portal session for existing customer', async () => {
            repo.findByUserId.mockResolvedValue(
                new Subscription({
                    userId: user.id,
                    stripeCustomerId: 'cus_1',
                    status: SubscriptionStatus.Active,
                })
            );
            gateway.createBillingPortalSession.mockResolvedValue({
                url: 'https://billing.stripe/portal',
            });
            const result = await service.startBillingPortal(user);
            expect(result.url).toBe('https://billing.stripe/portal');
            expect(gateway.createBillingPortalSession).toHaveBeenCalledWith(
                expect.objectContaining({ customerId: 'cus_1' })
            );
        });
    });

    describe('syncFromStripeSubscription', () => {
        const stripeSub = {
            id: 'sub_1',
            customer: 'cus_1',
            status: 'active',
            cancel_at_period_end: false,
            current_period_end: 1_800_000_000,
            items: {
                data: [{ price: { id: 'price_monthly' } }],
            },
        } as unknown as Stripe.Subscription;

        it('upserts subscription row from Stripe payload', async () => {
            repo.findByStripeCustomerId.mockResolvedValue(
                new Subscription({
                    userId: user.id,
                    stripeCustomerId: 'cus_1',
                    status: SubscriptionStatus.Incomplete,
                })
            );
            await service.syncFromStripeSubscription(stripeSub);
            expect(repo.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: user.id,
                    stripeCustomerId: 'cus_1',
                    stripeSubscriptionId: 'sub_1',
                    status: SubscriptionStatus.Active,
                    plan: SubscriptionPlan.Monthly,
                    cancelAtPeriodEnd: false,
                })
            );
            const upserted = repo.upsert.mock.calls[0][0];
            expect(upserted.currentPeriodEnd).toEqual(new Date(1_800_000_000 * 1000));
        });

        it('ignores subscription with unknown customer', async () => {
            repo.findByStripeCustomerId.mockResolvedValue(null);
            await service.syncFromStripeSubscription(stripeSub);
            expect(repo.upsert).not.toHaveBeenCalled();
        });
    });

    describe('handleSubscriptionDeleted', () => {
        it('marks subscription canceled', async () => {
            repo.findByStripeSubscriptionId.mockResolvedValue(
                new Subscription({
                    userId: user.id,
                    stripeCustomerId: 'cus_1',
                    stripeSubscriptionId: 'sub_1',
                    status: SubscriptionStatus.Active,
                    plan: SubscriptionPlan.Monthly,
                })
            );
            await service.handleSubscriptionDeleted('sub_1');
            expect(repo.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    stripeSubscriptionId: 'sub_1',
                    status: SubscriptionStatus.Canceled,
                })
            );
        });

        it('no-ops when subscription unknown', async () => {
            repo.findByStripeSubscriptionId.mockResolvedValue(null);
            await service.handleSubscriptionDeleted('sub_missing');
            expect(repo.upsert).not.toHaveBeenCalled();
        });
    });

    describe('getSubscriptionForUser', () => {
        it('returns null when no row', async () => {
            repo.findByUserId.mockResolvedValue(null);
            await expect(service.getSubscriptionForUser(user.id)).resolves.toBeNull();
        });

        it('returns Subscription with isActive true for active status', async () => {
            repo.findByUserId.mockResolvedValue(
                new Subscription({
                    userId: user.id,
                    stripeCustomerId: 'cus_1',
                    status: SubscriptionStatus.Active,
                })
            );
            const sub = await service.getSubscriptionForUser(user.id);
            expect(sub?.isActive()).toBe(true);
        });
    });
});

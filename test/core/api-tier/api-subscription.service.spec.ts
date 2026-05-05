import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiSubscription } from 'src/core/api-tier/api-subscription.entity';
import { ApiSubscriptionService } from 'src/core/api-tier/api-subscription.service';
import { ApiTier } from 'src/core/api-tier/api-tier.enum';
import { ApiSubscriptionRepositoryPort } from 'src/core/api-tier/ports/api-subscription.repository.port';
import { StripeGatewayPort } from 'src/core/billing/ports/stripe-gateway.port';
import { SubscriptionRepositoryPort } from 'src/core/billing/ports/subscription.repository.port';
import { SubscriptionStatus } from 'src/core/billing/subscription-status.enum';

describe('ApiSubscriptionService', () => {
    let service: ApiSubscriptionService;
    let repo: jest.Mocked<ApiSubscriptionRepositoryPort>;

    beforeEach(async () => {
        repo = {
            findByUserId: jest.fn(),
            findByStripeCustomerId: jest.fn(),
            findByStripeSubscriptionId: jest.fn(),
            upsert: jest.fn(),
            deleteByUserId: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApiSubscriptionService,
                { provide: ApiSubscriptionRepositoryPort, useValue: repo },
                { provide: SubscriptionRepositoryPort, useValue: { findByUserId: jest.fn(), findByStripeCustomerId: jest.fn() } },
                { provide: StripeGatewayPort, useValue: {} },
                { provide: ConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();

        service = module.get(ApiSubscriptionService);
    });

    describe('syncFromStripeSubscription', () => {
        it('returns false when price is not an API tier price', async () => {
            // Re-create service with a stripe gateway that returns null for apiTierForPriceId.
            const stripe = { apiTierForPriceId: jest.fn().mockReturnValue(null) };
            const customRepo = {
                findByUserId: jest.fn(),
                findByStripeCustomerId: jest.fn(),
                findByStripeSubscriptionId: jest.fn(),
                upsert: jest.fn(),
                deleteByUserId: jest.fn(),
            };
            const m = await Test.createTestingModule({
                providers: [
                    ApiSubscriptionService,
                    { provide: ApiSubscriptionRepositoryPort, useValue: customRepo },
                    { provide: SubscriptionRepositoryPort, useValue: { findByUserId: jest.fn(), findByStripeCustomerId: jest.fn() } },
                    { provide: StripeGatewayPort, useValue: stripe },
                    { provide: ConfigService, useValue: { get: jest.fn() } },
                ],
            }).compile();
            const svc = m.get(ApiSubscriptionService);
            const result = await svc.syncFromStripeSubscription({
                id: 'sub_consumer',
                customer: 'cus_x',
                status: 'active',
                items: { data: [{ price: { id: 'price_consumer_monthly' } }] },
            } as never);
            expect(result).toBe(false);
            expect(customRepo.upsert).not.toHaveBeenCalled();
        });

        it('upserts api_subscription when price matches a known API tier', async () => {
            const stripe = { apiTierForPriceId: jest.fn().mockReturnValue(ApiTier.Developer) };
            const customRepo = {
                findByUserId: jest.fn(),
                findByStripeCustomerId: jest.fn().mockResolvedValue(
                    new ApiSubscription({ id: 1, userId: 7, tier: ApiTier.Free, stripeCustomerId: 'cus_x' })
                ),
                findByStripeSubscriptionId: jest.fn(),
                upsert: jest.fn().mockImplementation(async (s) => s),
                deleteByUserId: jest.fn(),
            };
            const m = await Test.createTestingModule({
                providers: [
                    ApiSubscriptionService,
                    { provide: ApiSubscriptionRepositoryPort, useValue: customRepo },
                    { provide: SubscriptionRepositoryPort, useValue: { findByUserId: jest.fn(), findByStripeCustomerId: jest.fn() } },
                    { provide: StripeGatewayPort, useValue: stripe },
                    { provide: ConfigService, useValue: { get: jest.fn() } },
                ],
            }).compile();
            const svc = m.get(ApiSubscriptionService);
            const result = await svc.syncFromStripeSubscription({
                id: 'sub_dev',
                customer: 'cus_x',
                status: 'active',
                cancel_at_period_end: false,
                items: { data: [{ price: { id: 'price_developer' } }] },
            } as never);
            expect(result).toBe(true);
            expect(customRepo.upsert).toHaveBeenCalled();
            const upserted = customRepo.upsert.mock.calls[0][0] as ApiSubscription;
            expect(upserted.tier).toBe(ApiTier.Developer);
            expect(upserted.stripeSubscriptionId).toBe('sub_dev');
            expect(upserted.userId).toBe(7);
        });
    });

    describe('getEffectiveTier', () => {
        it('defaults to Free when no row exists', async () => {
            repo.findByUserId.mockResolvedValue(null);
            expect(await service.getEffectiveTier(1)).toBe(ApiTier.Free);
        });

        it('returns the configured tier when active', async () => {
            repo.findByUserId.mockResolvedValue(
                new ApiSubscription({
                    userId: 1,
                    tier: ApiTier.Developer,
                    status: SubscriptionStatus.Active,
                })
            );
            expect(await service.getEffectiveTier(1)).toBe(ApiTier.Developer);
        });

        it('returns Free for paid tier with inactive status', async () => {
            repo.findByUserId.mockResolvedValue(
                new ApiSubscription({
                    userId: 1,
                    tier: ApiTier.Business,
                    status: SubscriptionStatus.PastDue,
                })
            );
            expect(await service.getEffectiveTier(1)).toBe(ApiTier.Free);
        });
    });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ApiSubscription } from 'src/core/api-tier/api-subscription.entity';
import { ApiSubscriptionService } from 'src/core/api-tier/api-subscription.service';
import { ApiTier } from 'src/core/api-tier/api-tier.enum';
import { ApiSubscriptionRepositoryPort } from 'src/core/api-tier/ports/api-subscription.repository.port';
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
            ],
        }).compile();

        service = module.get(ApiSubscriptionService);
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

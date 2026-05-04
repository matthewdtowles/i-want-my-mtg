import { Inject, Injectable } from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';
import { ApiSubscription } from './api-subscription.entity';
import { ApiTier } from './api-tier.enum';
import { ApiSubscriptionRepositoryPort } from './ports/api-subscription.repository.port';

@Injectable()
export class ApiSubscriptionService {
    private readonly LOGGER = getLogger(ApiSubscriptionService.name);

    constructor(
        @Inject(ApiSubscriptionRepositoryPort)
        private readonly repository: ApiSubscriptionRepositoryPort
    ) {}

    async findByUserId(userId: number): Promise<ApiSubscription | null> {
        return this.repository.findByUserId(userId);
    }

    /** Resolves the active tier for a user, defaulting to Free when no row exists or the paid sub is inactive. */
    async getEffectiveTier(userId: number): Promise<ApiTier> {
        const sub = await this.repository.findByUserId(userId);
        if (!sub) return ApiTier.Free;
        return sub.effectiveTier();
    }
}

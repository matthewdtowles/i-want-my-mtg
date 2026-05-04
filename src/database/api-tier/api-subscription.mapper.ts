import { ApiSubscription } from 'src/core/api-tier/api-subscription.entity';
import { ApiTier } from 'src/core/api-tier/api-tier.enum';
import { SubscriptionStatus } from 'src/core/billing/subscription-status.enum';
import { ApiSubscriptionOrmEntity } from './api-subscription.orm-entity';

export class ApiSubscriptionMapper {
    static toCore(orm: ApiSubscriptionOrmEntity): ApiSubscription {
        return new ApiSubscription({
            id: orm.id,
            userId: orm.userId,
            tier: orm.tier as ApiTier,
            stripeCustomerId: orm.stripeCustomerId,
            stripeSubscriptionId: orm.stripeSubscriptionId,
            stripePriceId: orm.stripePriceId,
            status: orm.status ? (orm.status as SubscriptionStatus) : null,
            currentPeriodEnd: orm.currentPeriodEnd,
            cancelAtPeriodEnd: orm.cancelAtPeriodEnd,
        });
    }

    static toOrmEntity(core: ApiSubscription): ApiSubscriptionOrmEntity {
        const orm = new ApiSubscriptionOrmEntity();
        if (core.id !== null) orm.id = core.id;
        orm.userId = core.userId;
        orm.tier = core.tier;
        orm.stripeCustomerId = core.stripeCustomerId;
        orm.stripeSubscriptionId = core.stripeSubscriptionId;
        orm.stripePriceId = core.stripePriceId;
        orm.status = core.status;
        orm.currentPeriodEnd = core.currentPeriodEnd;
        orm.cancelAtPeriodEnd = core.cancelAtPeriodEnd;
        return orm;
    }
}

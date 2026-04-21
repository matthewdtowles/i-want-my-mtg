import { SubscriptionPlan } from 'src/core/billing/subscription-plan.enum';
import { SubscriptionStatus } from 'src/core/billing/subscription-status.enum';
import { Subscription } from 'src/core/billing/subscription.entity';
import { SubscriptionOrmEntity } from './subscription.orm-entity';

export class SubscriptionMapper {
    static toCore(orm: SubscriptionOrmEntity): Subscription {
        return new Subscription({
            id: orm.id,
            userId: orm.userId,
            stripeCustomerId: orm.stripeCustomerId,
            stripeSubscriptionId: orm.stripeSubscriptionId,
            stripePriceId: orm.stripePriceId,
            status: orm.status as SubscriptionStatus,
            plan: (orm.plan as SubscriptionPlan) ?? null,
            currentPeriodEnd: orm.currentPeriodEnd,
            cancelAtPeriodEnd: orm.cancelAtPeriodEnd,
        });
    }

    static toOrmEntity(core: Subscription): SubscriptionOrmEntity {
        const orm = new SubscriptionOrmEntity();
        orm.id = core.id;
        orm.userId = core.userId;
        orm.stripeCustomerId = core.stripeCustomerId;
        orm.stripeSubscriptionId = core.stripeSubscriptionId;
        orm.stripePriceId = core.stripePriceId;
        orm.status = core.status;
        orm.plan = core.plan;
        orm.currentPeriodEnd = core.currentPeriodEnd;
        orm.cancelAtPeriodEnd = core.cancelAtPeriodEnd;
        return orm;
    }
}

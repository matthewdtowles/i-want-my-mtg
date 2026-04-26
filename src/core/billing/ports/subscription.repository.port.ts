import { Subscription } from '../subscription.entity';

export const SubscriptionRepositoryPort = 'SubscriptionRepositoryPort';

export interface SubscriptionRepositoryPort {
    findByUserId(userId: number): Promise<Subscription | null>;
    findByStripeCustomerId(customerId: string): Promise<Subscription | null>;
    findByStripeSubscriptionId(subscriptionId: string): Promise<Subscription | null>;
    upsert(subscription: Subscription): Promise<Subscription>;
    deleteByUserId(userId: number): Promise<void>;
}

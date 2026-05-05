import { ApiSubscription } from '../api-subscription.entity';

export const ApiSubscriptionRepositoryPort = 'ApiSubscriptionRepositoryPort';

export interface ApiSubscriptionRepositoryPort {
    findByUserId(userId: number): Promise<ApiSubscription | null>;
    findByStripeCustomerId(customerId: string): Promise<ApiSubscription | null>;
    findByStripeSubscriptionId(subscriptionId: string): Promise<ApiSubscription | null>;
    upsert(subscription: ApiSubscription): Promise<ApiSubscription>;
    deleteByUserId(userId: number): Promise<void>;
}

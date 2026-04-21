import { SetMetadata } from '@nestjs/common';

export const REQUIRES_SUBSCRIPTION_KEY = 'requiresSubscription';

/**
 * Marks a route as requiring an active subscription.
 * Applied by SubscriptionGuard. Not enforced anywhere by default — ready for future premium gating.
 */
export const RequiresSubscription = (): MethodDecorator & ClassDecorator =>
    SetMetadata(REQUIRES_SUBSCRIPTION_KEY, true);

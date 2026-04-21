import type { Stripe } from './../stripe.types';
import { SubscriptionPlan } from '../subscription-plan.enum';

export const StripeGatewayPort = 'StripeGatewayPort';

export interface CheckoutSessionParams {
    customerId: string;
    plan: SubscriptionPlan;
    successUrl: string;
    cancelUrl: string;
    clientReferenceId?: string;
}

export interface StripeGatewayPort {
    createCustomer(params: { email: string; name?: string; userId: number }): Promise<string>;
    createCheckoutSession(params: CheckoutSessionParams): Promise<{ url: string }>;
    createBillingPortalSession(params: {
        customerId: string;
        returnUrl: string;
    }): Promise<{ url: string }>;
    retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
    constructEvent(rawBody: Buffer | string, signature: string): Stripe.Event;
    priceIdForPlan(plan: SubscriptionPlan): string;
    planForPriceId(priceId: string): SubscriptionPlan | null;
}

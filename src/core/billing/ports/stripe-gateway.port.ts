import { ApiTier } from 'src/core/api-tier/api-tier.enum';
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

export interface CheckoutSessionForPriceParams {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    clientReferenceId?: string;
}

export interface StripeGatewayPort {
    createCustomer(params: { email: string; name?: string; userId: number }): Promise<string>;
    createCheckoutSession(params: CheckoutSessionParams): Promise<{ url: string }>;
    createCheckoutSessionForPrice(params: CheckoutSessionForPriceParams): Promise<{ url: string }>;
    createBillingPortalSession(params: {
        customerId: string;
        returnUrl: string;
    }): Promise<{ url: string }>;
    retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
    retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session>;
    constructEvent(rawBody: Buffer | string, signature: string): Stripe.Event;
    priceIdForPlan(plan: SubscriptionPlan): string;
    planForPriceId(priceId: string): SubscriptionPlan | null;
    priceIdForApiTier(tier: ApiTier): string;
    apiTierForPriceId(priceId: string): ApiTier | null;
}

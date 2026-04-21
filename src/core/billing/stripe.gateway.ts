import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as StripeCtor from 'stripe';
import { getLogger } from 'src/logger/global-app-logger';
import type { Stripe } from './stripe.types';
import { CheckoutSessionParams, StripeGatewayPort } from './ports/stripe-gateway.port';
import { SubscriptionPlan } from './subscription-plan.enum';

@Injectable()
export class StripeGateway implements StripeGatewayPort, OnModuleInit {
    private readonly LOGGER = getLogger(StripeGateway.name);
    private client: Stripe | null = null;
    private webhookSecret = '';
    private monthlyPriceId = '';
    private annualPriceId = '';

    constructor(private readonly configService: ConfigService) {}

    onModuleInit(): void {
        const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
        this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
        this.monthlyPriceId = this.configService.get<string>('STRIPE_PRICE_MONTHLY') || '';
        this.annualPriceId = this.configService.get<string>('STRIPE_PRICE_ANNUAL') || '';
        if (!secretKey) {
            this.LOGGER.warn(
                'STRIPE_SECRET_KEY not set — billing endpoints will error until configured.'
            );
            return;
        }
        this.client = new StripeCtor(secretKey);
    }

    private requireClient(): Stripe {
        if (!this.client) {
            throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing).');
        }
        return this.client;
    }

    async createCustomer(params: {
        email: string;
        name?: string;
        userId: number;
    }): Promise<string> {
        const customer = await this.requireClient().customers.create({
            email: params.email,
            name: params.name,
            metadata: { userId: String(params.userId) },
        });
        return customer.id;
    }

    async createCheckoutSession(params: CheckoutSessionParams): Promise<{ url: string }> {
        const session = await this.requireClient().checkout.sessions.create({
            mode: 'subscription',
            customer: params.customerId,
            line_items: [{ price: this.priceIdForPlan(params.plan), quantity: 1 }],
            success_url: params.successUrl,
            cancel_url: params.cancelUrl,
            client_reference_id: params.clientReferenceId,
            allow_promotion_codes: true,
        });
        if (!session.url) {
            throw new Error('Stripe did not return a checkout URL.');
        }
        return { url: session.url };
    }

    async createBillingPortalSession(params: {
        customerId: string;
        returnUrl: string;
    }): Promise<{ url: string }> {
        const session = await this.requireClient().billingPortal.sessions.create({
            customer: params.customerId,
            return_url: params.returnUrl,
        });
        return { url: session.url };
    }

    async retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
        return this.requireClient().subscriptions.retrieve(subscriptionId);
    }

    constructEvent(rawBody: Buffer | string, signature: string): Stripe.Event {
        if (!this.webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
        }
        return this.requireClient().webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    }

    priceIdForPlan(plan: SubscriptionPlan): string {
        const id = plan === SubscriptionPlan.Annual ? this.annualPriceId : this.monthlyPriceId;
        if (!id) {
            throw new Error(`No Stripe price configured for plan '${plan}'.`);
        }
        return id;
    }

    planForPriceId(priceId: string): SubscriptionPlan | null {
        if (priceId === this.monthlyPriceId) return SubscriptionPlan.Monthly;
        if (priceId === this.annualPriceId) return SubscriptionPlan.Annual;
        return null;
    }
}

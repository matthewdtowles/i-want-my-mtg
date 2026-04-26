import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Stripe } from './stripe.types';
import { getLogger } from 'src/logger/global-app-logger';
import { User } from 'src/core/user/user.entity';
import { AlreadySubscribedError } from './already-subscribed.error';
import { StripeGatewayPort } from './ports/stripe-gateway.port';
import { SubscriptionRepositoryPort } from './ports/subscription.repository.port';
import { SubscriptionPlan } from './subscription-plan.enum';
import { BLOCKS_NEW_CHECKOUT_STATUSES, SubscriptionStatus } from './subscription-status.enum';
import { Subscription } from './subscription.entity';

@Injectable()
export class SubscriptionService {
    private readonly LOGGER = getLogger(SubscriptionService.name);

    constructor(
        @Inject(SubscriptionRepositoryPort) private readonly repository: SubscriptionRepositoryPort,
        @Inject(StripeGatewayPort) private readonly stripe: StripeGatewayPort,
        private readonly configService: ConfigService
    ) {}

    async getOrCreateCustomer(user: User): Promise<string> {
        const existing = await this.repository.findByUserId(user.id);
        if (existing) return existing.stripeCustomerId;

        const customerId = await this.stripe.createCustomer({
            email: user.email,
            name: user.name,
            userId: user.id,
        });
        await this.repository.upsert(
            new Subscription({
                userId: user.id,
                stripeCustomerId: customerId,
                status: SubscriptionStatus.Incomplete,
            })
        );
        this.LOGGER.log(`Created Stripe customer ${customerId} for user ${user.id}.`);
        return customerId;
    }

    async startCheckout(user: User, plan: SubscriptionPlan): Promise<{ url: string }> {
        const existing = await this.repository.findByUserId(user.id);
        if (existing && BLOCKS_NEW_CHECKOUT_STATUSES.has(existing.status)) {
            throw new AlreadySubscribedError(user.id);
        }
        const customerId = await this.getOrCreateCustomer(user);
        const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
        const successUrl =
            this.configService.get<string>('STRIPE_SUCCESS_URL') ||
            `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl =
            this.configService.get<string>('STRIPE_CANCEL_URL') || `${appUrl}/billing/canceled`;
        return this.stripe.createCheckoutSession({
            customerId,
            plan,
            successUrl,
            cancelUrl,
            clientReferenceId: String(user.id),
        });
    }

    async startBillingPortal(user: User): Promise<{ url: string }> {
        const existing = await this.repository.findByUserId(user.id);
        if (!existing) {
            throw new Error('User has no subscription or Stripe customer yet.');
        }
        const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
        return this.stripe.createBillingPortalSession({
            customerId: existing.stripeCustomerId,
            returnUrl: `${appUrl}/billing`,
        });
    }

    async syncFromStripeSubscription(stripeSub: Stripe.Subscription): Promise<void> {
        const customerId =
            typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;
        const existing = await this.repository.findByStripeCustomerId(customerId);
        if (!existing) {
            this.LOGGER.warn(
                `Received subscription event for unknown customer ${customerId}; skipping.`
            );
            return;
        }
        const priceId = stripeSub.items?.data?.[0]?.price?.id ?? null;
        const plan = priceId ? this.stripe.planForPriceId(priceId) : null;
        const periodEnd = (stripeSub as unknown as { current_period_end?: number })
            .current_period_end;
        await this.repository.upsert(
            new Subscription({
                id: existing.id,
                userId: existing.userId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: stripeSub.id,
                stripePriceId: priceId,
                status: stripeSub.status as SubscriptionStatus,
                plan,
                currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
                cancelAtPeriodEnd: !!stripeSub.cancel_at_period_end,
            })
        );
    }

    async handleSubscriptionDeleted(stripeSubscriptionId: string): Promise<void> {
        const existing = await this.repository.findByStripeSubscriptionId(stripeSubscriptionId);
        if (!existing) {
            this.LOGGER.warn(
                `Subscription deleted event for unknown subscription ${stripeSubscriptionId}.`
            );
            return;
        }
        await this.repository.upsert(
            new Subscription({
                id: existing.id,
                userId: existing.userId,
                stripeCustomerId: existing.stripeCustomerId,
                stripeSubscriptionId: existing.stripeSubscriptionId,
                stripePriceId: existing.stripePriceId,
                status: SubscriptionStatus.Canceled,
                plan: existing.plan,
                currentPeriodEnd: existing.currentPeriodEnd,
                cancelAtPeriodEnd: false,
            })
        );
    }

    async getSubscriptionForUser(userId: number): Promise<Subscription | null> {
        return this.repository.findByUserId(userId);
    }
}

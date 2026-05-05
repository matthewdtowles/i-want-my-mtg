import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StripeGatewayPort } from 'src/core/billing/ports/stripe-gateway.port';
import { SubscriptionRepositoryPort } from 'src/core/billing/ports/subscription.repository.port';
import { BLOCKS_NEW_CHECKOUT_STATUSES, SubscriptionStatus } from 'src/core/billing/subscription-status.enum';
import type { Stripe } from 'src/core/billing/stripe.types';
import { User } from 'src/core/user/user.entity';
import { getLogger } from 'src/logger/global-app-logger';
import { ApiSubscription } from './api-subscription.entity';
import { ApiTier } from './api-tier.enum';
import { ApiSubscriptionRepositoryPort } from './ports/api-subscription.repository.port';

@Injectable()
export class ApiSubscriptionService {
    private readonly LOGGER = getLogger(ApiSubscriptionService.name);

    constructor(
        @Inject(ApiSubscriptionRepositoryPort)
        private readonly repository: ApiSubscriptionRepositoryPort,
        @Inject(SubscriptionRepositoryPort)
        private readonly consumerSubscriptionRepository: SubscriptionRepositoryPort,
        @Inject(StripeGatewayPort) private readonly stripe: StripeGatewayPort,
        private readonly configService: ConfigService
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

    /**
     * Returns the user's existing Stripe customer id (from either consumer or API subscription
     * tables) or creates a new one. One Stripe Customer per user across both subscription types.
     */
    async getOrCreateCustomer(user: User): Promise<string> {
        const existingApi = await this.repository.findByUserId(user.id);
        if (existingApi?.stripeCustomerId) return existingApi.stripeCustomerId;
        const existingConsumer = await this.consumerSubscriptionRepository.findByUserId(user.id);
        if (existingConsumer?.stripeCustomerId) {
            await this.repository.upsert(
                new ApiSubscription({
                    userId: user.id,
                    tier: ApiTier.Free,
                    stripeCustomerId: existingConsumer.stripeCustomerId,
                })
            );
            return existingConsumer.stripeCustomerId;
        }
        const customerId = await this.stripe.createCustomer({
            email: user.email,
            name: user.name,
            userId: user.id,
        });
        await this.repository.upsert(
            new ApiSubscription({
                userId: user.id,
                tier: ApiTier.Free,
                stripeCustomerId: customerId,
            })
        );
        return customerId;
    }

    async startCheckout(user: User, tier: ApiTier): Promise<{ url: string }> {
        if (tier === ApiTier.Free) {
            throw new Error('Cannot checkout for Free tier.');
        }
        const existing = await this.repository.findByUserId(user.id);
        if (existing?.status && BLOCKS_NEW_CHECKOUT_STATUSES.has(existing.status)) {
            throw new Error('User already has an active API subscription.');
        }
        const customerId = await this.getOrCreateCustomer(user);
        const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
        return this.stripe.createCheckoutSessionForPrice({
            customerId,
            priceId: this.stripe.priceIdForApiTier(tier),
            successUrl: `${appUrl}/developer/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${appUrl}/developer/pricing`,
            clientReferenceId: String(user.id),
        });
    }

    async startBillingPortal(user: User): Promise<{ url: string }> {
        const existing = await this.repository.findByUserId(user.id);
        if (!existing?.stripeCustomerId) {
            throw new Error('User has no API Stripe customer yet.');
        }
        const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
        return this.stripe.createBillingPortalSession({
            customerId: existing.stripeCustomerId,
            returnUrl: `${appUrl}/user/api-keys`,
        });
    }

    /** Returns true if the event was for an API-tier price and was synced; false otherwise. */
    async syncFromStripeSubscription(stripeSub: Stripe.Subscription): Promise<boolean> {
        const priceId = stripeSub.items?.data?.[0]?.price?.id ?? null;
        if (!priceId) return false;
        const tier = this.stripe.apiTierForPriceId(priceId);
        if (!tier) return false;

        const customerId =
            typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id;
        const existing =
            (await this.repository.findByStripeCustomerId(customerId)) ??
            (await this.lookupByConsumerCustomerId(customerId));
        if (!existing) {
            this.LOGGER.warn(
                `Received API subscription event for unknown customer ${customerId}; skipping.`
            );
            return false;
        }
        const periodEnd = (stripeSub as unknown as { current_period_end?: number })
            .current_period_end;
        await this.repository.upsert(
            new ApiSubscription({
                id: existing.id,
                userId: existing.userId,
                tier,
                stripeCustomerId: customerId,
                stripeSubscriptionId: stripeSub.id,
                stripePriceId: priceId,
                status: stripeSub.status as SubscriptionStatus,
                currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
                cancelAtPeriodEnd: !!stripeSub.cancel_at_period_end,
            })
        );
        this.LOGGER.log(`Synced API subscription for user ${existing.userId}: tier=${tier}, status=${stripeSub.status}.`);
        return true;
    }

    async handleSubscriptionDeleted(stripeSubscriptionId: string): Promise<boolean> {
        const existing = await this.repository.findByStripeSubscriptionId(stripeSubscriptionId);
        if (!existing) return false;
        await this.repository.upsert(
            new ApiSubscription({
                id: existing.id,
                userId: existing.userId,
                tier: ApiTier.Free,
                stripeCustomerId: existing.stripeCustomerId,
                stripeSubscriptionId: existing.stripeSubscriptionId,
                stripePriceId: existing.stripePriceId,
                status: SubscriptionStatus.Canceled,
                currentPeriodEnd: existing.currentPeriodEnd,
                cancelAtPeriodEnd: false,
            })
        );
        return true;
    }

    async syncFromCheckoutSessionId(sessionId: string, userId: number): Promise<boolean> {
        try {
            const session = await this.stripe.retrieveCheckoutSession(sessionId);
            const clientReferenceId = session.client_reference_id?.trim();
            if (clientReferenceId !== String(userId)) {
                this.LOGGER.warn(
                    `API checkout session ${sessionId} mismatched client_reference_id for user ${userId}; skipping.`
                );
                return false;
            }
            const subId =
                typeof session.subscription === 'string'
                    ? session.subscription
                    : session.subscription?.id;
            if (!subId) return false;
            const full = await this.stripe.retrieveSubscription(subId);
            return this.syncFromStripeSubscription(full);
        } catch (error) {
            this.LOGGER.error(
                `Failed to sync API subscription from session ${sessionId}: ${error?.message}`
            );
            return false;
        }
    }

    private async lookupByConsumerCustomerId(customerId: string): Promise<ApiSubscription | null> {
        // Allow a webhook event to land before the user has an api_subscription row yet
        // (e.g. customer was created by consumer flow, then API checkout fires off and
        // the api_subscription upsert from getOrCreateCustomer hasn't been re-read).
        const consumer = await this.consumerSubscriptionRepository.findByStripeCustomerId(customerId);
        if (!consumer) return null;
        return new ApiSubscription({
            userId: consumer.userId,
            tier: ApiTier.Free,
            stripeCustomerId: customerId,
        });
    }
}

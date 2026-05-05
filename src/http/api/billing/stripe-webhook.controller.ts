import {
    BadRequestException,
    Controller,
    Headers,
    HttpCode,
    Inject,
    InternalServerErrorException,
    Post,
    RawBodyRequest,
    Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiSubscriptionService } from 'src/core/api-tier/api-subscription.service';
import type { Stripe } from 'src/core/billing/stripe.types';
import { StripeGatewayPort } from 'src/core/billing/ports/stripe-gateway.port';
import { StripeConfigurationError } from 'src/core/billing/stripe.gateway';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { getLogger } from 'src/logger/global-app-logger';

@ApiExcludeController()
@Controller('api/v1/billing/webhooks')
export class StripeWebhookController {
    private readonly LOGGER = getLogger(StripeWebhookController.name);

    constructor(
        @Inject(StripeGatewayPort) private readonly stripe: StripeGatewayPort,
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService,
        private readonly apiSubscriptionService: ApiSubscriptionService
    ) {}

    @Post('stripe')
    @HttpCode(200)
    async handle(
        @Req() req: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string
    ): Promise<{ received: boolean }> {
        if (!signature) {
            throw new BadRequestException('Missing Stripe-Signature header.');
        }
        if (!req.rawBody) {
            throw new BadRequestException('Missing raw request body.');
        }

        let event: Stripe.Event;
        try {
            event = this.stripe.constructEvent(req.rawBody, signature);
        } catch (error) {
            if (error instanceof StripeConfigurationError) {
                this.LOGGER.error(
                    `Stripe webhook received but gateway is misconfigured: ${error.message}`
                );
                // 500 so Stripe retries — config issues are a server problem, not a bad request.
                throw new InternalServerErrorException('Stripe webhook gateway misconfigured.');
            }
            this.LOGGER.warn(`Stripe webhook signature verification failed: ${error?.message}`);
            throw new BadRequestException('Invalid Stripe signature.');
        }

        this.LOGGER.log(`Stripe event ${event.type} (${event.id}) received.`);

        // Let unexpected errors (DB outage, network, bugs) propagate so Nest returns
        // 5xx and Stripe retries delivery. Known non-retryable cases (unknown customer,
        // unknown subscription) are handled inside SubscriptionService by logging and
        // returning normally, so they do not throw.
        await this.dispatch(event);

        return { received: true };
    }

    private async dispatch(event: Stripe.Event): Promise<void> {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const subId =
                    typeof session.subscription === 'string'
                        ? session.subscription
                        : session.subscription?.id;
                if (subId) {
                    const full = await this.stripe.retrieveSubscription(subId);
                    await this.routeSubscriptionEvent(full);
                }
                return;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                await this.routeSubscriptionEvent(event.data.object as Stripe.Subscription);
                return;
            }
            case 'customer.subscription.deleted': {
                const sub = event.data.object as Stripe.Subscription;
                // Try API service first; if it didn't own this subscription, fall back to consumer.
                const handledByApi = await this.apiSubscriptionService.handleSubscriptionDeleted(
                    sub.id
                );
                if (!handledByApi) {
                    await this.subscriptionService.handleSubscriptionDeleted(sub.id);
                }
                return;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                this.LOGGER.warn(
                    `Invoice payment failed for customer ${invoice.customer}, invoice ${invoice.id}.`
                );
                return;
            }
            default:
                this.LOGGER.debug(`Ignoring unhandled Stripe event type: ${event.type}.`);
        }
    }

    /**
     * Route by price_id. Consumer and API subscriptions intentionally share the same
     * Stripe customer, so we must positively identify the price as one or the other —
     * never default-route. An unknown price id throws so Stripe retries and the
     * misconfiguration (e.g. STRIPE_PRICE_API_* unset in this env) surfaces in logs.
     */
    private async routeSubscriptionEvent(stripeSub: Stripe.Subscription): Promise<void> {
        const priceId = stripeSub.items?.data?.[0]?.price?.id ?? null;
        if (!priceId) {
            this.LOGGER.error(
                `Subscription ${stripeSub.id} has no price id; cannot route to a subscription service.`
            );
            throw new InternalServerErrorException('Stripe subscription missing price id.');
        }
        if (this.stripe.apiTierForPriceId(priceId)) {
            await this.apiSubscriptionService.syncFromStripeSubscription(stripeSub);
            return;
        }
        if (this.stripe.planForPriceId(priceId)) {
            await this.subscriptionService.syncFromStripeSubscription(stripeSub);
            return;
        }
        this.LOGGER.error(
            `Subscription ${stripeSub.id} has unknown price id '${priceId}' (matches neither consumer nor API tier). ` +
                `Check STRIPE_PRICE_* env vars in this environment.`
        );
        throw new InternalServerErrorException(
            `Unknown Stripe price id '${priceId}'; cannot route subscription event safely.`
        );
    }
}

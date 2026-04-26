import {
    BadRequestException,
    Controller,
    Headers,
    HttpCode,
    Inject,
    Post,
    RawBodyRequest,
    Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import type { Stripe } from 'src/core/billing/stripe.types';
import { StripeGatewayPort } from 'src/core/billing/ports/stripe-gateway.port';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { getLogger } from 'src/logger/global-app-logger';

@ApiExcludeController()
@Controller('api/v1/billing/webhooks')
export class StripeWebhookController {
    private readonly LOGGER = getLogger(StripeWebhookController.name);

    constructor(
        @Inject(StripeGatewayPort) private readonly stripe: StripeGatewayPort,
        @Inject(SubscriptionService) private readonly subscriptionService: SubscriptionService
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
                    await this.subscriptionService.syncFromStripeSubscription(full);
                }
                return;
            }
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                await this.subscriptionService.syncFromStripeSubscription(
                    event.data.object as Stripe.Subscription
                );
                return;
            }
            case 'customer.subscription.deleted': {
                const sub = event.data.object as Stripe.Subscription;
                await this.subscriptionService.handleSubscriptionDeleted(sub.id);
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
}

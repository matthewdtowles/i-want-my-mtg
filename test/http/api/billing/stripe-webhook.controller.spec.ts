import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiSubscriptionService } from 'src/core/api-tier/api-subscription.service';
import type { Stripe } from 'src/core/billing/stripe.types';
import { StripeGatewayPort } from 'src/core/billing/ports/stripe-gateway.port';
import { SubscriptionService } from 'src/core/billing/subscription.service';
import { StripeWebhookController } from 'src/http/api/billing/stripe-webhook.controller';

describe('StripeWebhookController', () => {
    let controller: StripeWebhookController;
    let gateway: jest.Mocked<StripeGatewayPort>;
    let service: jest.Mocked<SubscriptionService>;

    const rawReq = { rawBody: Buffer.from('{"id":"evt_1"}') } as any;

    beforeEach(async () => {
        gateway = {
            createCustomer: jest.fn(),
            createCheckoutSession: jest.fn(),
            createBillingPortalSession: jest.fn(),
            retrieveSubscription: jest.fn(),
            retrieveCheckoutSession: jest.fn(),
            constructEvent: jest.fn(),
            priceIdForPlan: jest.fn(),
            planForPriceId: jest.fn(),
            createCheckoutSessionForPrice: jest.fn(),
            priceIdForApiTier: jest.fn(),
            apiTierForPriceId: jest.fn().mockReturnValue(null),
        };
        // Default: any price id is treated as a known consumer plan so legacy tests
        // (which don't care about routing) keep working. Tests that exercise unknown
        // price ids override this.
        gateway.planForPriceId.mockReturnValue('monthly' as any);
        service = {
            getOrCreateCustomer: jest.fn(),
            startCheckout: jest.fn(),
            startBillingPortal: jest.fn(),
            syncFromStripeSubscription: jest.fn().mockResolvedValue(true),
            handleSubscriptionDeleted: jest.fn(),
            getSubscriptionForUser: jest.fn(),
        } as any;
        const apiSubService = {
            syncFromStripeSubscription: jest.fn().mockResolvedValue(false),
            handleSubscriptionDeleted: jest.fn().mockResolvedValue(false),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [StripeWebhookController],
            providers: [
                { provide: StripeGatewayPort, useValue: gateway },
                { provide: SubscriptionService, useValue: service },
                { provide: ApiSubscriptionService, useValue: apiSubService },
            ],
        }).compile();

        controller = module.get(StripeWebhookController);
    });

    it('rejects missing signature', async () => {
        await expect(controller.handle(rawReq, '')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects missing raw body', async () => {
        await expect(controller.handle({} as any, 'sig')).rejects.toBeInstanceOf(
            BadRequestException
        );
    });

    it('rejects invalid signature (throws 400)', async () => {
        gateway.constructEvent.mockImplementation(() => {
            throw new Error('bad sig');
        });
        await expect(controller.handle(rawReq, 'sig')).rejects.toBeInstanceOf(BadRequestException);
    });

    function subWithPrice(id: string, priceId = 'price_consumer'): Stripe.Subscription {
        return { id, items: { data: [{ price: { id: priceId } }] } } as unknown as Stripe.Subscription;
    }

    it('syncs subscription on customer.subscription.updated', async () => {
        const stripeSub = subWithPrice('sub_1');
        gateway.constructEvent.mockReturnValue({
            type: 'customer.subscription.updated',
            data: { object: stripeSub },
        } as unknown as Stripe.Event);
        const result = await controller.handle(rawReq, 'sig');
        expect(service.syncFromStripeSubscription).toHaveBeenCalledWith(stripeSub);
        expect(result).toEqual({ received: true });
    });

    it('retrieves full subscription on checkout.session.completed', async () => {
        gateway.constructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: { subscription: 'sub_2' } },
        } as unknown as Stripe.Event);
        const full = subWithPrice('sub_2');
        gateway.retrieveSubscription.mockResolvedValue(full);
        await controller.handle(rawReq, 'sig');
        expect(gateway.retrieveSubscription).toHaveBeenCalledWith('sub_2');
        expect(service.syncFromStripeSubscription).toHaveBeenCalledWith(full);
    });

    it('calls handleSubscriptionDeleted on customer.subscription.deleted', async () => {
        gateway.constructEvent.mockReturnValue({
            type: 'customer.subscription.deleted',
            data: { object: { id: 'sub_3' } },
        } as unknown as Stripe.Event);
        await controller.handle(rawReq, 'sig');
        expect(service.handleSubscriptionDeleted).toHaveBeenCalledWith('sub_3');
    });

    it('returns 200 for unhandled event types without calling service', async () => {
        gateway.constructEvent.mockReturnValue({
            type: 'customer.created',
            data: { object: {} },
        } as unknown as Stripe.Event);
        const result = await controller.handle(rawReq, 'sig');
        expect(result).toEqual({ received: true });
        expect(service.syncFromStripeSubscription).not.toHaveBeenCalled();
    });

    it('propagates unexpected dispatch errors so Stripe retries', async () => {
        gateway.constructEvent.mockReturnValue({
            type: 'customer.subscription.updated',
            data: { object: subWithPrice('sub_x') },
        } as unknown as Stripe.Event);
        service.syncFromStripeSubscription.mockRejectedValue(new Error('boom'));
        await expect(controller.handle(rawReq, 'sig')).rejects.toThrow('boom');
    });

    it('throws when consumer sync returns false so Stripe retries', async () => {
        service.syncFromStripeSubscription.mockResolvedValueOnce(false);
        gateway.constructEvent.mockReturnValue({
            type: 'customer.subscription.updated',
            data: { object: subWithPrice('sub_orphan') },
        } as unknown as Stripe.Event);
        await expect(controller.handle(rawReq, 'sig')).rejects.toThrow(
            /Failed to sync consumer subscription/
        );
    });

    it('throws on unknown price id so Stripe retries (no silent default-route to consumer)', async () => {
        gateway.planForPriceId.mockReturnValue(null);
        gateway.apiTierForPriceId.mockReturnValue(null);
        gateway.constructEvent.mockReturnValue({
            type: 'customer.subscription.updated',
            data: { object: subWithPrice('sub_unknown', 'price_unknown') },
        } as unknown as Stripe.Event);
        await expect(controller.handle(rawReq, 'sig')).rejects.toThrow(/Unknown Stripe price id/);
        expect(service.syncFromStripeSubscription).not.toHaveBeenCalled();
    });
});

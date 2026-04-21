import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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
            constructEvent: jest.fn(),
            priceIdForPlan: jest.fn(),
            planForPriceId: jest.fn(),
        };
        service = {
            getOrCreateCustomer: jest.fn(),
            startCheckout: jest.fn(),
            startBillingPortal: jest.fn(),
            syncFromStripeSubscription: jest.fn(),
            handleSubscriptionDeleted: jest.fn(),
            getSubscriptionForUser: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [StripeWebhookController],
            providers: [
                { provide: StripeGatewayPort, useValue: gateway },
                { provide: SubscriptionService, useValue: service },
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

    it('syncs subscription on customer.subscription.updated', async () => {
        const stripeSub = { id: 'sub_1' } as unknown as Stripe.Subscription;
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
        const full = { id: 'sub_2' } as unknown as Stripe.Subscription;
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

    it('swallows domain errors but still returns 200', async () => {
        gateway.constructEvent.mockReturnValue({
            type: 'customer.subscription.updated',
            data: { object: {} },
        } as unknown as Stripe.Event);
        service.syncFromStripeSubscription.mockRejectedValue(new Error('boom'));
        const result = await controller.handle(rawReq, 'sig');
        expect(result).toEqual({ received: true });
    });
});

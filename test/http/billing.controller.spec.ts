import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { BillingController } from 'src/http/hbs/billing/billing.controller';
import { BillingOrchestrator } from 'src/http/hbs/billing/billing.orchestrator';
import { BillingViewDto } from 'src/http/hbs/billing/dto/billing.view.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';

function makeRes(): jest.Mocked<Response> {
    return {
        redirect: jest.fn().mockReturnThis(),
        render: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<Response>;
}

function makeReq(userId = 42): AuthenticatedRequest {
    return {
        user: { id: userId },
    } as AuthenticatedRequest;
}

function makeView(overrides: Partial<BillingViewDto> = {}): BillingViewDto {
    return new BillingViewDto({
        authenticated: true,
        subscribed: false,
        breadcrumbs: [],
        indexable: false,
        title: 'Subscription - I Want My MTG',
        subscription: null,
        ...overrides,
    });
}

describe('BillingController', () => {
    let controller: BillingController;
    let orchestrator: jest.Mocked<BillingOrchestrator>;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [BillingController],
            providers: [
                {
                    provide: BillingOrchestrator,
                    useValue: {
                        getBillingView: jest.fn(),
                        startCheckout: jest.fn(),
                        startBillingPortal: jest.fn(),
                        syncFromCheckoutSession: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get(BillingController);
        orchestrator = module.get(BillingOrchestrator) as jest.Mocked<BillingOrchestrator>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('success', () => {
        it('redirects back to billing when session verification fails and the user is still unsubscribed', async () => {
            const req = makeReq();
            const res = makeRes();
            orchestrator.syncFromCheckoutSession.mockResolvedValue(false);
            orchestrator.getBillingView.mockResolvedValue(makeView({ subscribed: false }));

            await controller.success(req, res, 'cs_invalid');

            expect(orchestrator.syncFromCheckoutSession).toHaveBeenCalledWith(req, 'cs_invalid');
            expect(res.redirect).toHaveBeenCalledWith(303, '/billing?error=invalid_session');
            expect(res.render).not.toHaveBeenCalled();
        });

        it('renders success when the checkout session is verified even if activation is still pending', async () => {
            const req = makeReq();
            const res = makeRes();
            orchestrator.syncFromCheckoutSession.mockResolvedValue(true);
            orchestrator.getBillingView.mockResolvedValue(makeView({ subscribed: false }));

            await controller.success(req, res, 'cs_verified');

            expect(res.redirect).not.toHaveBeenCalled();
            expect(res.render).toHaveBeenCalledWith(
                'billingSuccess',
                expect.objectContaining({ title: 'Welcome to Premium - I Want My MTG' })
            );
        });

        it('renders success when the user is already subscribed even if session verification returns false', async () => {
            const req = makeReq();
            const res = makeRes();
            orchestrator.syncFromCheckoutSession.mockResolvedValue(false);
            orchestrator.getBillingView.mockResolvedValue(makeView({ subscribed: true }));

            await controller.success(req, res, 'cs_old');

            expect(res.redirect).not.toHaveBeenCalled();
            expect(res.render).toHaveBeenCalledWith(
                'billingSuccess',
                expect.objectContaining({ subscribed: true })
            );
        });
    });
});
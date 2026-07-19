import { InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PriceAlertService } from 'src/core/price-alert/price-alert.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { PriceAlertPageOrchestrator } from 'src/http/hbs/price-alert/price-alert-page.orchestrator';

describe('PriceAlertPageOrchestrator', () => {
    let orchestrator: PriceAlertPageOrchestrator;
    let priceAlertService: jest.Mocked<PriceAlertService>;

    const authedReq = { user: { id: 4 } } as AuthenticatedRequest;
    const anonReq = { user: null } as unknown as AuthenticatedRequest;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PriceAlertPageOrchestrator,
                { provide: PriceAlertService, useValue: { countByUser: jest.fn() } },
            ],
        }).compile();

        orchestrator = module.get(PriceAlertPageOrchestrator);
        priceAlertService = module.get(PriceAlertService);
    });

    beforeEach(() => jest.clearAllMocks());

    it('builds the view with hasAlerts true when the user has alerts', async () => {
        priceAlertService.countByUser.mockResolvedValue(5);

        const view = await orchestrator.buildListView(authedReq);

        expect(priceAlertService.countByUser).toHaveBeenCalledWith(4);
        expect(view.authenticated).toBe(true);
        expect(view.hasAlerts).toBe(true);
        expect(view.title).toBe('Price Alerts - I Want My MTG');
        expect(view.breadcrumbs).toEqual([
            { label: 'Home', url: '/' },
            { label: 'Price Alerts', url: '/price-alerts' },
        ]);
    });

    it('sets hasAlerts false when there are none', async () => {
        priceAlertService.countByUser.mockResolvedValue(0);

        const view = await orchestrator.buildListView(authedReq);

        expect(view.hasAlerts).toBe(false);
    });

    it('throws Unauthorized for an unauthenticated request', async () => {
        await expect(orchestrator.buildListView(anonReq)).rejects.toThrow(UnauthorizedException);
        expect(priceAlertService.countByUser).not.toHaveBeenCalled();
    });

    it('maps an unexpected service error to a 500', async () => {
        priceAlertService.countByUser.mockRejectedValue(new Error('db down'));

        await expect(orchestrator.buildListView(authedReq)).rejects.toThrow(
            InternalServerErrorException
        );
    });
});

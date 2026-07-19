import { InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BuyListService } from 'src/core/buy-list/buy-list.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { BuyListPageOrchestrator } from 'src/http/hbs/buy-list/buy-list-page.orchestrator';

describe('BuyListPageOrchestrator', () => {
    let orchestrator: BuyListPageOrchestrator;
    let buyListService: jest.Mocked<BuyListService>;

    const authedReq = { user: { id: 1 } } as AuthenticatedRequest;
    const anonReq = { user: null } as unknown as AuthenticatedRequest;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BuyListPageOrchestrator,
                { provide: BuyListService, useValue: { count: jest.fn() } },
            ],
        }).compile();

        orchestrator = module.get(BuyListPageOrchestrator);
        buyListService = module.get(BuyListService);
    });

    beforeEach(() => jest.clearAllMocks());

    it('builds the view with hasItems true when the user has items', async () => {
        buyListService.count.mockResolvedValue(3);

        const view = await orchestrator.buildListView(authedReq);

        expect(buyListService.count).toHaveBeenCalledWith(1);
        expect(view.authenticated).toBe(true);
        expect(view.hasItems).toBe(true);
        expect(view.title).toBe('Buy List - I Want My MTG');
        expect(view.breadcrumbs).toEqual([
            { label: 'Home', url: '/' },
            { label: 'Buy List', url: '/buy-list' },
        ]);
    });

    it('sets hasItems false when the buy list is empty', async () => {
        buyListService.count.mockResolvedValue(0);

        const view = await orchestrator.buildListView(authedReq);

        expect(view.hasItems).toBe(false);
    });

    it('throws Unauthorized for an unauthenticated request', async () => {
        await expect(orchestrator.buildListView(anonReq)).rejects.toThrow(UnauthorizedException);
        expect(buyListService.count).not.toHaveBeenCalled();
    });

    it('maps an unexpected service error to a 500', async () => {
        buyListService.count.mockRejectedValue(new Error('db down'));

        await expect(orchestrator.buildListView(authedReq)).rejects.toThrow(
            InternalServerErrorException
        );
    });
});

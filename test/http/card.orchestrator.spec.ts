import { Test, TestingModule } from '@nestjs/testing';
import { Card } from 'src/core/card/card.entity';
import { CardRarity } from 'src/core/card/card.rarity.enum';
import { CardService } from 'src/core/card/card.service';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { CardOrchestrator } from 'src/http/hbs/card/card.orchestrator';
import { CardViewDto } from 'src/http/hbs/card/dto/card.view.dto';
import { HttpErrorHandler } from 'src/http/http.error.handler';

jest.mock('src/http/http.error.handler');

describe('CardOrchestrator', () => {
    let orchestrator: CardOrchestrator;
    let cardService: CardService;
    let inventoryService: InventoryService;
    let transactionService: jest.Mocked<TransactionService>;

    const mockCardService = {
        findBySetCodeAndNumber: jest.fn(),
        findWithName: jest.fn(),
        totalWithName: jest.fn(),
        findPriceHistory: jest.fn(),
    };

    const mockInventoryService = {
        findForUser: jest.fn(),
    };

    const mockHttpErrorHandler = {
        toHttpException: jest.fn(),
    };

    const mockAuthenticatedRequest = {
        user: {
            id: 1,
            name: 'Test User',
        },
        query: { page: '1', limit: '10' },
        isAuthenticated: () => true,
    } as unknown as AuthenticatedRequest;

    const mockCard: Card = new Card({
        id: 'card1',
        imgSrc: 'https://example.com/card1.png',
        legalities: [],
        name: 'Lightning Bolt',
        setCode: 'TST',
        number: '1',
        manaCost: '{R}',
        type: 'Instant',
        rarity: CardRarity.Common,
        artist: 'Christopher Rush',
        prices: [],
        sortNumber: '000001',
        inMain: true,
    });

    const mockOtherPrintingCard: Card = new Card({
        id: 'card2',
        imgSrc: 'https://example.com/card2.png',
        legalities: [],
        name: 'Lightning Bolt',
        setCode: 'M10',
        number: '149',
        manaCost: '{R}',
        type: 'Instant',
        rarity: CardRarity.Common,
        artist: 'Christopher Rush',
        prices: [],
        sortNumber: '000149',
        inMain: true,
    });

    const mockQueryOptions = new SafeQueryOptions({ page: '1', limit: '10' });

    const mockInventory = [
        {
            userId: 1,
            cardId: 'card1',
            quantity: 3,
            isFoil: false,
        },
    ];

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CardOrchestrator,
                {
                    provide: CardService,
                    useValue: mockCardService,
                },
                {
                    provide: InventoryService,
                    useValue: mockInventoryService,
                },
                {
                    provide: TransactionService,
                    useValue: {
                        getCostBasis: jest.fn().mockResolvedValue({
                            totalCost: 0,
                            totalQuantity: 0,
                            averageCost: 0,
                            unrealizedGain: 0,
                            realizedGain: 0,
                        }),
                        getRemainingQuantity: jest.fn().mockResolvedValue(0),
                    },
                },
            ],
        }).compile();

        orchestrator = module.get<CardOrchestrator>(CardOrchestrator);
        cardService = module.get<CardService>(CardService);
        inventoryService = module.get<InventoryService>(InventoryService);
        transactionService = module.get(TransactionService) as jest.Mocked<TransactionService>;

        (HttpErrorHandler.toHttpException as unknown as jest.Mock) =
            mockHttpErrorHandler.toHttpException;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findSetCard', () => {
        it('should return card view with card and other printings', async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findWithName.mockResolvedValue([mockCard, mockOtherPrintingCard]);
            mockCardService.totalWithName.mockResolvedValue(2);
            mockInventoryService.findForUser.mockResolvedValue(mockInventory);

            const result: CardViewDto = await orchestrator.findSetCard(
                mockAuthenticatedRequest,
                'TST',
                '1'
            );

            expect(result).toBeDefined();
            expect(result.authenticated).toBe(true);
            expect(result.card).toBeDefined();
            expect(result.card.name).toBe('Lightning Bolt');
            expect(result.card.setCode).toBe('TST');
            expect(result.card.number).toBe('1');
            expect(result.otherPrintings).toHaveLength(1);
            expect(result.otherPrintings[0].setCode).toBe('M10');
            expect(result.toast).toBeUndefined();
            expect(result.breadcrumbs).toHaveLength(4);
            expect(result.breadcrumbs[3].label).toBe('Lightning Bolt');

            expect(cardService.findBySetCodeAndNumber).toHaveBeenCalled();
            expect(cardService.findWithName).toHaveBeenCalled();
            expect(inventoryService.findForUser).toHaveBeenCalled();
        });

        it('should throw error when card not found', async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(null);
            const notFoundError = new Error('Card with set code INVALID and number 999 not found');
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw notFoundError;
            });

            await expect(
                orchestrator.findSetCard(mockAuthenticatedRequest, 'INVALID', '999')
            ).rejects.toThrow('Card with set code INVALID and number 999 not found');

            expect(cardService.findBySetCodeAndNumber).toHaveBeenCalledWith('INVALID', '999');
            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Card with set code INVALID and number 999 not found',
                }),
                'findSetCard'
            );
        });

        it('should handle unauthenticated requests', async () => {
            const unauthenticatedReq = {
                user: null,
                query: { page: '1', limit: '10' },
                isAuthenticated: () => false,
            } as unknown as AuthenticatedRequest;

            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findWithName.mockResolvedValue([mockCard, mockOtherPrintingCard]);
            mockCardService.totalWithName.mockResolvedValue(2);

            const result: CardViewDto = await orchestrator.findSetCard(
                unauthenticatedReq,
                'TST',
                '1'
            );

            expect(result.authenticated).toBe(false);
            expect(result.card).toBeDefined();
            expect(result.card.name).toBe('Lightning Bolt');
            expect(inventoryService.findForUser).not.toHaveBeenCalled();
        });

        it('should handle no other printings case', async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findWithName.mockResolvedValue([mockCard]);
            mockCardService.totalWithName.mockResolvedValue(1);
            mockInventoryService.findForUser.mockResolvedValue(mockInventory);

            const result: CardViewDto = await orchestrator.findSetCard(
                mockAuthenticatedRequest,
                'TST',
                '1'
            );

            expect(result).toBeDefined();
            expect(result.otherPrintings).toHaveLength(0);
            expect(result.card.name).toBe('Lightning Bolt');
            expect(result.toast).toBeUndefined();
        });

        it('should handle empty inventory', async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findWithName.mockResolvedValue([mockCard, mockOtherPrintingCard]);
            mockCardService.totalWithName.mockResolvedValue(2);
            mockInventoryService.findForUser.mockResolvedValue([]);

            const result: CardViewDto = await orchestrator.findSetCard(
                mockAuthenticatedRequest,
                'TST',
                '1'
            );

            expect(result).toBeDefined();
            expect(result.card).toBeDefined();
            expect(result.card.name).toBe('Lightning Bolt');
            expect(result.otherPrintings).toHaveLength(1);
            expect(inventoryService.findForUser).toHaveBeenCalledWith(1, 'card1');
        });

        it('should handle service errors', async () => {
            const serviceError = new Error('Database connection failed');
            mockCardService.findBySetCodeAndNumber.mockRejectedValue(serviceError);
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw serviceError;
            });

            await expect(
                orchestrator.findSetCard(mockAuthenticatedRequest, 'TST', '1')
            ).rejects.toThrow('Database connection failed');

            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(
                serviceError,
                'findSetCard'
            );
        });

        it('should handle inventory service errors gracefully', async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.totalWithName.mockResolvedValue(2);
            const inventoryError = new Error('Inventory service failed');
            mockInventoryService.findForUser.mockRejectedValue(inventoryError);
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw inventoryError;
            });

            await expect(
                orchestrator.findSetCard(mockAuthenticatedRequest, 'TST', '1')
            ).rejects.toThrow('Inventory service failed');

            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(
                inventoryError,
                'findSetCard'
            );
        });

        it('should create correct breadcrumbs', async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findWithName.mockResolvedValue([mockCard]);
            mockCardService.totalWithName.mockResolvedValue(1);
            mockInventoryService.findForUser.mockResolvedValue([]);

            const result: CardViewDto = await orchestrator.findSetCard(
                mockAuthenticatedRequest,
                'TST',
                '1'
            );

            expect(result.breadcrumbs).toEqual([
                { label: 'Home', url: '/' },
                { label: 'Sets', url: '/sets' },
                { label: 'TST', url: '/sets/TST' },
                { label: 'Lightning Bolt', url: '/card/tst/1' },
            ]);
        });

        it('should include pagination view', async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findWithName.mockResolvedValue([mockCard, mockOtherPrintingCard]);
            mockCardService.totalWithName.mockResolvedValue(25);
            mockInventoryService.findForUser.mockResolvedValue([]);

            const result: CardViewDto = await orchestrator.findSetCard(
                mockAuthenticatedRequest,
                'TST',
                '1'
            );

            expect(result.pagination).toBeDefined();
            expect(result.pagination.current).toBe(1);
            expect(result.pagination.totalPages).toBeGreaterThan(0);
        });

        it('should include filter view', async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findWithName.mockResolvedValue([mockCard]);
            mockCardService.totalWithName.mockResolvedValue(1);
            mockInventoryService.findForUser.mockResolvedValue([]);

            const result: CardViewDto = await orchestrator.findSetCard(
                mockAuthenticatedRequest,
                'TST',
                '1'
            );

            expect(result.filter).toBeDefined();
        });

        it('should include table headers row', async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(mockCard);
            mockCardService.findWithName.mockResolvedValue([mockCard]);
            mockCardService.totalWithName.mockResolvedValue(1);
            mockInventoryService.findForUser.mockResolvedValue([]);

            const result: CardViewDto = await orchestrator.findSetCard(
                mockAuthenticatedRequest,
                'TST',
                '1'
            );

            expect(result.tableHeadersRow).toBeDefined();
            expect(result.tableHeadersRow.headers).toBeDefined();
            expect(result.tableHeadersRow.headers.length).toBe(2);
        });
    });

    describe('untracked quantity calculation', () => {
        const cardWithFoil = new Card({
            id: 'card1',
            imgSrc: 'https://example.com/card1.png',
            legalities: [],
            name: 'Lightning Bolt',
            setCode: 'TST',
            number: '1',
            manaCost: '{R}',
            type: 'Instant',
            rarity: CardRarity.Common,
            artist: 'Christopher Rush',
            prices: [],
            sortNumber: '000001',
            inMain: true,
            hasFoil: true,
            hasNonFoil: true,
        });

        const setupMocks = (
            normalInv: number,
            foilInv: number,
            txNormal: number,
            txFoil: number
        ) => {
            const inventory = [];
            if (normalInv > 0)
                inventory.push({ userId: 1, cardId: 'card1', quantity: normalInv, isFoil: false });
            if (foilInv > 0)
                inventory.push({ userId: 1, cardId: 'card1', quantity: foilInv, isFoil: true });

            mockCardService.findBySetCodeAndNumber.mockResolvedValue(cardWithFoil);
            mockCardService.findWithName.mockResolvedValue([cardWithFoil]);
            mockCardService.totalWithName.mockResolvedValue(1);
            mockInventoryService.findForUser.mockResolvedValue(inventory);
            transactionService.getRemainingQuantity
                .mockResolvedValueOnce(txNormal)
                .mockResolvedValueOnce(txFoil);
        };

        it('should compute untracked normal quantity when inventory > transactions', async () => {
            setupMocks(5, 0, 2, 0);

            const result = await orchestrator.findSetCard(mockAuthenticatedRequest, 'TST', '1');

            expect(result.untrackedNormal).toBe(3);
            expect(result.untrackedFoil).toBe(0);
        });

        it('should compute untracked foil quantity when inventory > transactions', async () => {
            setupMocks(0, 4, 0, 1);

            const result = await orchestrator.findSetCard(mockAuthenticatedRequest, 'TST', '1');

            expect(result.untrackedNormal).toBe(0);
            expect(result.untrackedFoil).toBe(3);
        });

        it('should compute untracked for both normal and foil simultaneously', async () => {
            setupMocks(5, 3, 2, 1);

            const result = await orchestrator.findSetCard(mockAuthenticatedRequest, 'TST', '1');

            expect(result.untrackedNormal).toBe(3);
            expect(result.untrackedFoil).toBe(2);
        });

        it('should return 0 untracked when inventory equals transaction quantity', async () => {
            setupMocks(3, 2, 3, 2);

            const result = await orchestrator.findSetCard(mockAuthenticatedRequest, 'TST', '1');

            expect(result.untrackedNormal).toBe(0);
            expect(result.untrackedFoil).toBe(0);
        });

        it('should never return negative untracked (transactions > inventory)', async () => {
            setupMocks(1, 0, 5, 0);

            const result = await orchestrator.findSetCard(mockAuthenticatedRequest, 'TST', '1');

            expect(result.untrackedNormal).toBe(0);
            expect(result.untrackedFoil).toBe(0);
        });

        it('should return 0 untracked when no inventory exists', async () => {
            setupMocks(0, 0, 0, 0);

            const result = await orchestrator.findSetCard(mockAuthenticatedRequest, 'TST', '1');

            expect(result.untrackedNormal).toBe(0);
            expect(result.untrackedFoil).toBe(0);
        });

        it('should handle getRemainingQuantity errors gracefully', async () => {
            mockCardService.findBySetCodeAndNumber.mockResolvedValue(cardWithFoil);
            mockCardService.findWithName.mockResolvedValue([cardWithFoil]);
            mockCardService.totalWithName.mockResolvedValue(1);
            mockInventoryService.findForUser.mockResolvedValue([
                { userId: 1, cardId: 'card1', quantity: 5, isFoil: false },
            ]);
            transactionService.getRemainingQuantity.mockRejectedValue(new Error('DB error'));

            const result = await orchestrator.findSetCard(mockAuthenticatedRequest, 'TST', '1');

            expect(result.untrackedNormal).toBe(0);
            expect(result.untrackedFoil).toBe(0);
        });

        it('should not compute untracked for unauthenticated users', async () => {
            const unauthenticatedReq = {
                user: null,
                query: { page: '1', limit: '10' },
                isAuthenticated: () => false,
            } as unknown as AuthenticatedRequest;

            mockCardService.findBySetCodeAndNumber.mockResolvedValue(cardWithFoil);
            mockCardService.findWithName.mockResolvedValue([cardWithFoil]);
            mockCardService.totalWithName.mockResolvedValue(1);

            const result = await orchestrator.findSetCard(unauthenticatedReq, 'TST', '1');

            expect(result.untrackedNormal).toBe(0);
            expect(result.untrackedFoil).toBe(0);
            expect(transactionService.getRemainingQuantity).not.toHaveBeenCalled();
        });
    });

    describe('getPriceHistory', () => {
        it('should return formatted price history for a card', async () => {
            const mockPrices = [
                { id: 1, cardId: 'card1', normal: 1.5, foil: 3.0, date: new Date('2025-01-01') },
                { id: 2, cardId: 'card1', normal: 1.75, foil: null, date: new Date('2025-01-02') },
            ];
            mockCardService.findPriceHistory.mockResolvedValue(mockPrices);

            const result = await orchestrator.getPriceHistory('card1');

            expect(result.cardId).toBe('card1');
            expect(result.prices).toHaveLength(2);
            expect(result.prices[0]).toEqual({ date: '2025-01-01', normal: 1.5, foil: 3 });
            expect(result.prices[1]).toEqual({ date: '2025-01-02', normal: 1.75, foil: null });
            expect(cardService.findPriceHistory).toHaveBeenCalledWith('card1', undefined);
        });

        it('should pass days parameter to service', async () => {
            mockCardService.findPriceHistory.mockResolvedValue([]);

            const result = await orchestrator.getPriceHistory('card1', 30);

            expect(cardService.findPriceHistory).toHaveBeenCalledWith('card1', 30);
            expect(result.prices).toEqual([]);
        });

        it('should handle service errors', async () => {
            const serviceError = new Error('Database error');
            mockCardService.findPriceHistory.mockRejectedValue(serviceError);
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw serviceError;
            });

            await expect(orchestrator.getPriceHistory('card1')).rejects.toThrow('Database error');

            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(
                serviceError,
                'getPriceHistory'
            );
        });
    });

    describe('getPrintingsLastPage', () => {
        it('should return correct last page for total printings', async () => {
            mockCardService.totalWithName.mockResolvedValue(25);

            const result = await orchestrator.getPrintingsLastPage(
                'Lightning Bolt',
                mockQueryOptions
            );

            expect(result).toBe(3);
            expect(cardService.totalWithName).toHaveBeenCalledWith('Lightning Bolt');
        });

        it('should return 1 for single page of results', async () => {
            mockCardService.totalWithName.mockResolvedValue(5);

            const result = await orchestrator.getPrintingsLastPage(
                'Lightning Bolt',
                mockQueryOptions
            );

            expect(result).toBe(1);
        });

        it('should return 1 for zero results', async () => {
            mockCardService.totalWithName.mockResolvedValue(0);

            const result = await orchestrator.getPrintingsLastPage(
                'Lightning Bolt',
                mockQueryOptions
            );

            expect(result).toBe(1);
        });

        it('should handle service errors', async () => {
            const serviceError = new Error('Database error');
            mockCardService.totalWithName.mockRejectedValue(serviceError);
            mockHttpErrorHandler.toHttpException.mockImplementation(() => {
                throw serviceError;
            });

            await expect(
                orchestrator.getPrintingsLastPage('Lightning Bolt', mockQueryOptions)
            ).rejects.toThrow('Database error');

            expect(HttpErrorHandler.toHttpException).toHaveBeenCalledWith(
                serviceError,
                'getPrintingsLastPage'
            );
        });
    });
});

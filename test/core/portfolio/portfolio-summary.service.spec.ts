import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { PortfolioCardPerformance } from 'src/core/portfolio/portfolio-card-performance.entity';
import { PortfolioCardPerformanceRepositoryPort } from 'src/core/portfolio/ports/portfolio-card-performance.repository.port';
import { PortfolioComputationService } from 'src/core/portfolio/portfolio-computation.service';
import { PortfolioSummary } from 'src/core/portfolio/portfolio-summary.entity';
import { PortfolioSummaryRepositoryPort } from 'src/core/portfolio/ports/portfolio-summary.repository.port';
import { PortfolioSummaryService } from 'src/core/portfolio/portfolio-summary.service';
import { Card } from 'src/core/card/card.entity';
import { Price } from 'src/core/card/price.entity';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { Transaction } from 'src/core/transaction/transaction.entity';

describe('PortfolioSummaryService', () => {
    let service: PortfolioSummaryService;
    let summaryRepository: jest.Mocked<PortfolioSummaryRepositoryPort>;
    let performanceRepository: jest.Mocked<PortfolioCardPerformanceRepositoryPort>;
    let inventoryService: jest.Mocked<InventoryService>;
    let transactionService: jest.Mocked<TransactionService>;

    const mockTransaction = jest.fn((cb: (manager: any) => Promise<any>) => cb({}));
    const mockSummaryRepo = {
        findByUser: jest.fn(),
        findByUserForUpdate: jest.fn(),
        save: jest.fn(),
        getManager: jest.fn(() => ({ transaction: mockTransaction })),
    };

    const mockPerformanceRepo = {
        findByUser: jest.fn(),
        replaceForUser: jest.fn(),
    };

    const mockInventoryService = {
        findAllForUser: jest.fn(),
        totalOwnedValue: jest.fn(),
    };

    const mockTransactionService = {
        findByUser: jest.fn(),
        getFifoLotAllocations: jest.fn(),
        computeFifoFromTransactions: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn((key: string, defaultValue: string) => {
            if (key === 'PORTFOLIO_REFRESH_MAX_DAILY') return '3';
            if (key === 'PORTFOLIO_REFRESH_COOLDOWN_MINUTES') return '60';
            return defaultValue;
        }),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PortfolioSummaryService,
                PortfolioComputationService,
                { provide: PortfolioSummaryRepositoryPort, useValue: mockSummaryRepo },
                { provide: PortfolioCardPerformanceRepositoryPort, useValue: mockPerformanceRepo },
                { provide: InventoryService, useValue: mockInventoryService },
                { provide: TransactionService, useValue: mockTransactionService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<PortfolioSummaryService>(PortfolioSummaryService);
        summaryRepository = module.get(
            PortfolioSummaryRepositoryPort
        ) as jest.Mocked<PortfolioSummaryRepositoryPort>;
        performanceRepository = module.get(
            PortfolioCardPerformanceRepositoryPort
        ) as jest.Mocked<PortfolioCardPerformanceRepositoryPort>;
        inventoryService = module.get(InventoryService) as jest.Mocked<InventoryService>;
        transactionService = module.get(TransactionService) as jest.Mocked<TransactionService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const makeCard = (id: string, normalPrice: number, foilPrice: number | null = null): Card =>
        new Card({
            id,
            name: `Card ${id}`,
            imgSrc: 'img.png',
            legalities: [],
            number: '1',
            rarity: 'common' as any,
            setCode: 'SET',
            sortNumber: '001',
            type: 'Creature',
            prices: [
                new Price({ cardId: id, normal: normalPrice, foil: foilPrice, date: new Date() }),
            ],
        });

    const makeInventory = (cardId: string, qty: number, isFoil: boolean, card?: Card): Inventory =>
        new Inventory({ cardId, userId: 1, isFoil, quantity: qty, card });

    const makeTransaction = (
        cardId: string,
        type: 'BUY' | 'SELL',
        qty: number,
        price: number,
        isFoil = false
    ): Transaction =>
        new Transaction({
            id: Math.random() * 1000,
            userId: 1,
            cardId,
            type,
            quantity: qty,
            pricePerUnit: price,
            isFoil,
            date: new Date(),
            createdAt: new Date(),
        });

    describe('getSummary', () => {
        it('should return summary from repository', async () => {
            const summary = new PortfolioSummary({
                userId: 1,
                totalValue: 100,
                totalCards: 5,
                totalQuantity: 10,
                computedAt: new Date(),
            });
            summaryRepository.findByUser.mockResolvedValue(summary);

            const result = await service.getSummary(1);
            expect(result).toEqual(summary);
            expect(summaryRepository.findByUser).toHaveBeenCalledWith(1);
        });

        it('should return null when no summary exists', async () => {
            summaryRepository.findByUser.mockResolvedValue(null);
            const result = await service.getSummary(1);
            expect(result).toBeNull();
        });
    });

    describe('getCardPerformance', () => {
        it('should return card performance from repository', async () => {
            const perf = new PortfolioCardPerformance({
                userId: 1,
                cardId: 'card1',
                isFoil: false,
                quantity: 2,
                totalCost: 10,
                averageCost: 5,
                currentValue: 14,
                unrealizedGain: 4,
                realizedGain: 0,
                computedAt: new Date(),
            });
            performanceRepository.findByUser.mockResolvedValue([perf]);

            const result = await service.getCardPerformance(1, 'best', 10);
            expect(result).toEqual([perf]);
            expect(performanceRepository.findByUser).toHaveBeenCalledWith(1, 'best', 10);
        });
    });

    describe('computeSummary', () => {
        it('should compute summary without transactions', async () => {
            const card = makeCard('card1', 5.0);
            const inv = makeInventory('card1', 3, false, card);

            inventoryService.findAllForUser.mockResolvedValue([inv]);
            inventoryService.totalOwnedValue.mockResolvedValue(15.0);
            transactionService.findByUser.mockResolvedValue([]);

            const result = await service.computeSummary(1);

            expect(result.userId).toBe(1);
            expect(result.totalValue).toBe(15.0);
            expect(result.totalCost).toBeNull();
            expect(result.totalRealizedGain).toBeNull();
            expect(result.totalCards).toBe(1);
            expect(result.totalQuantity).toBe(3);
            expect(performanceRepository.replaceForUser).toHaveBeenCalledWith(1, [], undefined);
        });

        it('should compute summary with transactions and FIFO cost basis', async () => {
            const card = makeCard('card1', 7.0);
            const inv = makeInventory('card1', 2, false, card);

            const buyTx = makeTransaction('card1', 'BUY', 3, 5.0);
            const sellTx = makeTransaction('card1', 'SELL', 1, 8.0);

            inventoryService.findAllForUser.mockResolvedValue([inv]);
            inventoryService.totalOwnedValue.mockResolvedValue(14.0);
            transactionService.findByUser.mockResolvedValue([buyTx, sellTx]);
            transactionService.computeFifoFromTransactions.mockReturnValue({
                lots: [{ lotId: 1, remaining: 2, costPerUnit: 5.0 }],
                totalSoldCost: 5.0,
                totalRealizedGain: 3.0,
            });

            const result = await service.computeSummary(1);

            expect(result.totalValue).toBe(14.0);
            expect(result.totalCost).toBe(10.0); // 2 * 5.0
            expect(result.totalRealizedGain).toBe(3.0);
            expect(result.totalCards).toBe(1);
            expect(result.totalQuantity).toBe(2);

            // Should save per-card performance
            expect(performanceRepository.replaceForUser).toHaveBeenCalledWith(
                1,
                expect.arrayContaining([
                    expect.objectContaining({
                        cardId: 'card1',
                        quantity: 2,
                        totalCost: 10.0,
                        averageCost: 5.0,
                        currentValue: 14.0,
                        unrealizedGain: 4.0,
                        realizedGain: 3.0,
                    }),
                ]),
                undefined
            );
        });

        it('should handle foil and non-foil separately', async () => {
            const card = makeCard('card1', 5.0, 10.0);
            const invNormal = makeInventory('card1', 2, false, card);
            const invFoil = makeInventory('card1', 1, true, card);

            const buyNormal = makeTransaction('card1', 'BUY', 2, 4.0, false);
            const buyFoil = makeTransaction('card1', 'BUY', 1, 8.0, true);

            inventoryService.findAllForUser.mockResolvedValue([invNormal, invFoil]);
            inventoryService.totalOwnedValue.mockResolvedValue(20.0);
            transactionService.findByUser.mockResolvedValue([buyNormal, buyFoil]);

            transactionService.computeFifoFromTransactions
                .mockReturnValueOnce({
                    lots: [{ lotId: 1, remaining: 2, costPerUnit: 4.0 }],
                    totalSoldCost: 0,
                    totalRealizedGain: 0,
                })
                .mockReturnValueOnce({
                    lots: [{ lotId: 2, remaining: 1, costPerUnit: 8.0 }],
                    totalSoldCost: 0,
                    totalRealizedGain: 0,
                });

            const result = await service.computeSummary(1);

            expect(result.totalCost).toBe(16.0); // 8.0 + 8.0
            expect(result.totalRealizedGain).toBe(0);
            expect(performanceRepository.replaceForUser).toHaveBeenCalledWith(
                1,
                expect.arrayContaining([
                    expect.objectContaining({ cardId: 'card1', isFoil: false }),
                    expect.objectContaining({ cardId: 'card1', isFoil: true }),
                ]),
                undefined
            );
        });

        it('should include fully sold cards in realized gain', async () => {
            // Card was bought and fully sold - no inventory remains
            const sellTx = makeTransaction('card1', 'SELL', 2, 10.0);
            const buyTx = makeTransaction('card1', 'BUY', 2, 5.0);

            inventoryService.findAllForUser.mockResolvedValue([]);
            inventoryService.totalOwnedValue.mockResolvedValue(0);
            transactionService.findByUser.mockResolvedValue([buyTx, sellTx]);
            transactionService.computeFifoFromTransactions.mockReturnValue({
                lots: [],
                totalSoldCost: 10.0,
                totalRealizedGain: 10.0,
            });

            const result = await service.computeSummary(1);

            expect(result.totalRealizedGain).toBe(10.0);
            expect(result.totalCost).toBe(0);
            expect(result.totalCards).toBe(0);
            expect(result.totalQuantity).toBe(0);
        });
    });

    describe('refreshSummary', () => {
        it('should allow refresh when no previous summary exists', async () => {
            summaryRepository.findByUserForUpdate.mockResolvedValue(null);
            inventoryService.findAllForUser.mockResolvedValue([]);
            inventoryService.totalOwnedValue.mockResolvedValue(0);
            transactionService.findByUser.mockResolvedValue([]);
            summaryRepository.save.mockImplementation(async (s: any) => s);

            const result = await service.refreshSummary(1);

            expect(result.refreshesToday).toBe(1);
            expect(summaryRepository.save).toHaveBeenCalled();
        });

        it('should set computationMethod to fifo on refresh', async () => {
            summaryRepository.findByUserForUpdate.mockResolvedValue(null);
            inventoryService.findAllForUser.mockResolvedValue([]);
            inventoryService.totalOwnedValue.mockResolvedValue(0);
            transactionService.findByUser.mockResolvedValue([]);
            summaryRepository.save.mockImplementation(async (s: any) => s);

            const result = await service.refreshSummary(1);

            expect(result.computationMethod).toBe('fifo');
        });

        it('should increment refreshes_today on same day', async () => {
            const existing = new PortfolioSummary({
                userId: 1,
                totalValue: 100,
                totalCards: 5,
                totalQuantity: 10,
                computedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
                refreshesToday: 1,
                lastRefreshDate: new Date(), // today
            });
            summaryRepository.findByUserForUpdate.mockResolvedValue(existing);
            inventoryService.findAllForUser.mockResolvedValue([]);
            inventoryService.totalOwnedValue.mockResolvedValue(0);
            transactionService.findByUser.mockResolvedValue([]);
            summaryRepository.save.mockImplementation(async (s: any) => s);

            const result = await service.refreshSummary(1);

            expect(result.refreshesToday).toBe(2);
        });

        it('should reset refreshes_today on new day', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const existing = new PortfolioSummary({
                userId: 1,
                totalValue: 100,
                totalCards: 5,
                totalQuantity: 10,
                computedAt: yesterday,
                refreshesToday: 3,
                lastRefreshDate: yesterday,
            });
            summaryRepository.findByUserForUpdate.mockResolvedValue(existing);
            inventoryService.findAllForUser.mockResolvedValue([]);
            inventoryService.totalOwnedValue.mockResolvedValue(0);
            transactionService.findByUser.mockResolvedValue([]);
            summaryRepository.save.mockImplementation(async (s: any) => s);

            const result = await service.refreshSummary(1);

            expect(result.refreshesToday).toBe(1);
        });

        it('should throw when daily limit reached', async () => {
            const existing = new PortfolioSummary({
                userId: 1,
                totalValue: 100,
                totalCards: 5,
                totalQuantity: 10,
                computedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
                refreshesToday: 3,
                lastRefreshDate: new Date(),
            });
            summaryRepository.findByUserForUpdate.mockResolvedValue(existing);

            await expect(service.refreshSummary(1)).rejects.toThrow(
                'Daily refresh limit reached (3)'
            );
        });

        it('should throw when cooldown not elapsed', async () => {
            const existing = new PortfolioSummary({
                userId: 1,
                totalValue: 100,
                totalCards: 5,
                totalQuantity: 10,
                computedAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
                refreshesToday: 1,
                lastRefreshDate: new Date(),
            });
            summaryRepository.findByUserForUpdate.mockResolvedValue(existing);

            await expect(service.refreshSummary(1)).rejects.toThrow('Please wait');
        });
    });
});

import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CardService } from 'src/core/card/card.service';
import { PortfolioSummary } from 'src/core/portfolio/portfolio-summary.entity';
import { PortfolioSummaryService } from 'src/core/portfolio/portfolio-summary.service';
import { PortfolioValueHistory } from 'src/core/portfolio/portfolio-value-history.entity';
import { PortfolioService } from 'src/core/portfolio/portfolio.service';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { PortfolioOrchestrator } from 'src/http/portfolio/portfolio.orchestrator';

describe('PortfolioOrchestrator', () => {
    let orchestrator: PortfolioOrchestrator;
    let portfolioService: jest.Mocked<PortfolioService>;
    let summaryService: jest.Mocked<PortfolioSummaryService>;

    const mockAuthenticatedRequest = {
        user: { id: 1, name: 'Test User', email: 'test@example.com' },
        isAuthenticated: () => true,
    } as AuthenticatedRequest;

    const mockUnauthenticatedRequest = {
        user: null,
        isAuthenticated: () => false,
    } as unknown as AuthenticatedRequest;

    const testHistory: PortfolioValueHistory[] = [
        new PortfolioValueHistory({
            id: 1,
            userId: 1,
            totalValue: 100.5,
            totalCost: 80.0,
            totalCards: 25,
            date: new Date('2025-06-01'),
        }),
        new PortfolioValueHistory({
            id: 2,
            userId: 1,
            totalValue: 110.25,
            totalCost: 80.0,
            totalCards: 27,
            date: new Date('2025-06-02'),
        }),
    ];

    const testSummary = new PortfolioSummary({
        userId: 1,
        totalValue: 110.25,
        totalCost: 80.0,
        totalRealizedGain: 5.0,
        totalCards: 27,
        totalQuantity: 50,
        computedAt: new Date(),
        refreshesToday: 1,
        lastRefreshDate: new Date(),
    });

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PortfolioOrchestrator,
                {
                    provide: PortfolioService,
                    useValue: { getHistory: jest.fn() },
                },
                {
                    provide: PortfolioSummaryService,
                    useValue: {
                        getSummary: jest.fn(),
                        getCardPerformance: jest.fn(),
                        getSetRoi: jest.fn(),
                        refreshSummary: jest.fn(),
                    },
                },
                {
                    provide: CardService,
                    useValue: { findByIds: jest.fn() },
                },
                {
                    provide: TransactionService,
                    useValue: {
                        findByUser: jest.fn(),
                        getFifoLotAllocations: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string, defaultValue: string) => defaultValue),
                    },
                },
            ],
        }).compile();

        orchestrator = module.get(PortfolioOrchestrator);
        portfolioService = module.get(PortfolioService) as jest.Mocked<PortfolioService>;
        summaryService = module.get(
            PortfolioSummaryService
        ) as jest.Mocked<PortfolioSummaryService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getPortfolioView', () => {
        it('should return view with hasHistory true when history exists', async () => {
            portfolioService.getHistory.mockResolvedValue(testHistory);
            summaryService.getSummary.mockResolvedValue(null);

            const result = await orchestrator.getPortfolioView(mockAuthenticatedRequest);

            expect(result.authenticated).toBe(true);
            expect(result.username).toBe('Test User');
            expect(result.hasHistory).toBe(true);
            expect(result.hasSummary).toBe(false);
            expect(result.breadcrumbs).toHaveLength(3);
        });

        it('should return view with hasHistory false when no history', async () => {
            portfolioService.getHistory.mockResolvedValue([]);
            summaryService.getSummary.mockResolvedValue(null);

            const result = await orchestrator.getPortfolioView(mockAuthenticatedRequest);

            expect(result.hasHistory).toBe(false);
        });

        it('should include summary data when summary exists', async () => {
            portfolioService.getHistory.mockResolvedValue(testHistory);
            summaryService.getSummary.mockResolvedValue(testSummary);
            summaryService.getCardPerformance.mockResolvedValue([]);
            summaryService.getSetRoi.mockResolvedValue([]);

            const result = await orchestrator.getPortfolioView(mockAuthenticatedRequest);

            expect(result.hasSummary).toBe(true);
            expect(result.summary).toBeDefined();
            expect(result.summary.totalValue).toBe('$110.25');
            expect(result.summary.totalCost).toBe('$80.00');
            expect(result.summary.totalCards).toBe(27);
            expect(result.summary.totalQuantity).toBe(50);
        });

        it('should throw on unauthenticated request', async () => {
            await expect(
                orchestrator.getPortfolioView(mockUnauthenticatedRequest)
            ).rejects.toThrow();
        });
    });

    describe('getHistory', () => {
        it('should return history points with formatted dates', async () => {
            portfolioService.getHistory.mockResolvedValue(testHistory);

            const result = await orchestrator.getHistory(mockAuthenticatedRequest);

            expect(result.history).toHaveLength(2);
            expect(result.history[0].date).toBe('2025-06-01');
            expect(result.history[0].totalValue).toBe(100.5);
            expect(result.history[0].totalCost).toBe(80.0);
            expect(result.history[0].totalCards).toBe(25);
            expect(result.history[1].date).toBe('2025-06-02');
        });

        it('should pass days parameter to service', async () => {
            portfolioService.getHistory.mockResolvedValue([]);

            await orchestrator.getHistory(mockAuthenticatedRequest, 30);

            expect(portfolioService.getHistory).toHaveBeenCalledWith(1, 30);
        });

        it('should return empty history when service returns empty', async () => {
            portfolioService.getHistory.mockResolvedValue([]);

            const result = await orchestrator.getHistory(mockAuthenticatedRequest);

            expect(result.history).toHaveLength(0);
        });

        it('should handle null totalCost', async () => {
            const historyWithNullCost = [
                new PortfolioValueHistory({
                    id: 1,
                    userId: 1,
                    totalValue: 50.0,
                    totalCost: null,
                    totalCards: 10,
                    date: new Date('2025-06-01'),
                }),
            ];
            portfolioService.getHistory.mockResolvedValue(historyWithNullCost);

            const result = await orchestrator.getHistory(mockAuthenticatedRequest);

            expect(result.history[0].totalCost).toBeNull();
        });

        it('should throw on unauthenticated request', async () => {
            await expect(orchestrator.getHistory(mockUnauthenticatedRequest)).rejects.toThrow();
        });
    });

    describe('refresh', () => {
        it('should return success on successful refresh', async () => {
            summaryService.refreshSummary.mockResolvedValue(testSummary);

            const result = await orchestrator.refresh(mockAuthenticatedRequest);

            expect(result.success).toBe(true);
            expect(summaryService.refreshSummary).toHaveBeenCalledWith(1);
        });

        it('should return error on rate limit', async () => {
            summaryService.refreshSummary.mockRejectedValue(
                new Error('Daily refresh limit reached (3)')
            );

            const result = await orchestrator.refresh(mockAuthenticatedRequest);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Daily refresh limit');
        });
    });
});

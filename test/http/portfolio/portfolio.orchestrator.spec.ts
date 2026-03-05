import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioValueHistory } from 'src/core/portfolio/portfolio-value-history.entity';
import { PortfolioService } from 'src/core/portfolio/portfolio.service';
import { AuthenticatedRequest } from 'src/http/base/authenticated.request';
import { PortfolioOrchestrator } from 'src/http/portfolio/portfolio.orchestrator';

describe('PortfolioOrchestrator', () => {
    let orchestrator: PortfolioOrchestrator;
    let portfolioService: jest.Mocked<PortfolioService>;

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

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PortfolioOrchestrator,
                {
                    provide: PortfolioService,
                    useValue: {
                        getHistory: jest.fn(),
                    },
                },
            ],
        }).compile();

        orchestrator = module.get(PortfolioOrchestrator);
        portfolioService = module.get(PortfolioService) as jest.Mocked<PortfolioService>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getPortfolioView', () => {
        it('should return view with hasHistory true when history exists', async () => {
            portfolioService.getHistory.mockResolvedValue(testHistory);

            const result = await orchestrator.getPortfolioView(mockAuthenticatedRequest);

            expect(result.authenticated).toBe(true);
            expect(result.username).toBe('Test User');
            expect(result.hasHistory).toBe(true);
            expect(result.breadcrumbs).toHaveLength(3);
        });

        it('should return view with hasHistory false when no history', async () => {
            portfolioService.getHistory.mockResolvedValue([]);

            const result = await orchestrator.getPortfolioView(mockAuthenticatedRequest);

            expect(result.hasHistory).toBe(false);
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

            const result = await orchestrator.getHistory(1);

            expect(result.history).toHaveLength(2);
            expect(result.history[0].date).toBe('2025-06-01');
            expect(result.history[0].totalValue).toBe(100.5);
            expect(result.history[0].totalCost).toBe(80.0);
            expect(result.history[0].totalCards).toBe(25);
            expect(result.history[1].date).toBe('2025-06-02');
        });

        it('should pass days parameter to service', async () => {
            portfolioService.getHistory.mockResolvedValue([]);

            await orchestrator.getHistory(1, 30);

            expect(portfolioService.getHistory).toHaveBeenCalledWith(1, 30);
        });

        it('should return empty history when service returns empty', async () => {
            portfolioService.getHistory.mockResolvedValue([]);

            const result = await orchestrator.getHistory(1);

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

            const result = await orchestrator.getHistory(1);

            expect(result.history[0].totalCost).toBeNull();
        });
    });
});

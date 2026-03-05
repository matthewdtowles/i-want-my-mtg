import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioValueHistory } from 'src/core/portfolio/portfolio-value-history.entity';
import { PortfolioValueHistoryRepositoryPort } from 'src/core/portfolio/portfolio-value-history.repository.port';
import { PortfolioService } from 'src/core/portfolio/portfolio.service';

describe('PortfolioService', () => {
    let service: PortfolioService;
    let repository: jest.Mocked<PortfolioValueHistoryRepositoryPort>;

    const testHistory = new PortfolioValueHistory({
        id: 1,
        userId: 1,
        totalValue: 100.5,
        totalCost: 80.0,
        totalCards: 25,
        date: new Date('2026-03-01'),
    });

    const testHistory2 = new PortfolioValueHistory({
        id: 2,
        userId: 1,
        totalValue: 105.0,
        totalCost: 80.0,
        totalCards: 26,
        date: new Date('2026-03-02'),
    });

    const mockRepository = {
        findByUser: jest.fn(),
    };

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PortfolioService,
                { provide: PortfolioValueHistoryRepositoryPort, useValue: mockRepository },
            ],
        }).compile();

        service = module.get<PortfolioService>(PortfolioService);
        repository = module.get(
            PortfolioValueHistoryRepositoryPort
        ) as jest.Mocked<PortfolioValueHistoryRepositoryPort>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getHistory', () => {
        it('should return portfolio history for a user', async () => {
            const expectedHistory = [testHistory, testHistory2];
            repository.findByUser.mockResolvedValue(expectedHistory);

            const result = await service.getHistory(1);

            expect(repository.findByUser).toHaveBeenCalledWith(1, undefined);
            expect(result).toEqual(expectedHistory);
        });

        it('should pass days parameter to repository', async () => {
            repository.findByUser.mockResolvedValue([testHistory2]);

            const result = await service.getHistory(1, 7);

            expect(repository.findByUser).toHaveBeenCalledWith(1, 7);
            expect(result).toEqual([testHistory2]);
        });

        it('should return empty array when no history exists', async () => {
            repository.findByUser.mockResolvedValue([]);

            const result = await service.getHistory(1);

            expect(repository.findByUser).toHaveBeenCalledWith(1, undefined);
            expect(result).toEqual([]);
        });
    });
});

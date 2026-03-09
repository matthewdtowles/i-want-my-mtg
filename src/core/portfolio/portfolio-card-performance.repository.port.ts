import { EntityManager } from 'typeorm';
import { PortfolioCardPerformance } from './portfolio-card-performance.entity';

export const PortfolioCardPerformanceRepositoryPort = 'PortfolioCardPerformanceRepositoryPort';

export interface SetRoiAggregation {
    setCode: string;
    setName: string;
    cardsHeld: number;
    totalCost: number;
    currentValue: number;
    gain: number;
    roiPercent: number | null;
}

export interface PortfolioCardPerformanceRepositoryPort {
    findByUser(userId: number, sortBy: string, limit: number): Promise<PortfolioCardPerformance[]>;
    replaceForUser(
        userId: number,
        performances: PortfolioCardPerformance[],
        manager?: EntityManager
    ): Promise<void>;
    aggregateBySet(userId: number): Promise<SetRoiAggregation[]>;
}

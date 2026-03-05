import { PortfolioValueHistory } from './portfolio-value-history.entity';

export const PortfolioValueHistoryRepositoryPort = 'PortfolioValueHistoryRepositoryPort';

export interface PortfolioValueHistoryRepositoryPort {
    findByUser(userId: number, days?: number): Promise<PortfolioValueHistory[]>;
}

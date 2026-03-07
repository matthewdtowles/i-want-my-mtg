import { PortfolioSummary } from './portfolio-summary.entity';

export const PortfolioSummaryRepositoryPort = 'PortfolioSummaryRepositoryPort';

export interface PortfolioSummaryRepositoryPort {
    findByUser(userId: number): Promise<PortfolioSummary | null>;
    save(summary: PortfolioSummary): Promise<PortfolioSummary>;
}

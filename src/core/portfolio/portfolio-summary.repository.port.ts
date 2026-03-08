import { PortfolioSummary } from './portfolio-summary.entity';

export const PortfolioSummaryRepositoryPort = 'PortfolioSummaryRepositoryPort';

export interface PortfolioSummaryRepositoryPort {
    findByUser(userId: number): Promise<PortfolioSummary | null>;
    findByUserForUpdate(userId: number, manager: any): Promise<PortfolioSummary | null>;
    save(summary: PortfolioSummary): Promise<PortfolioSummary>;
    getManager(): any;
}

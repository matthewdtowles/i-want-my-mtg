import { EntityManager } from 'typeorm';
import { PortfolioSummary } from './portfolio-summary.entity';

export const PortfolioSummaryRepositoryPort = 'PortfolioSummaryRepositoryPort';

export interface PortfolioSummaryRepositoryPort {
    findByUser(userId: number): Promise<PortfolioSummary | null>;
    findByUserForUpdate(userId: number, manager: EntityManager): Promise<PortfolioSummary | null>;
    save(summary: PortfolioSummary, manager?: EntityManager): Promise<PortfolioSummary>;
    getManager(): EntityManager;
}

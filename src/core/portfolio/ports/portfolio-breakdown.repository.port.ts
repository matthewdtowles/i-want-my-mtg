import { BreakdownDimension, PortfolioBreakdownSlice } from '../portfolio-breakdown.entity';

export const PortfolioBreakdownRepositoryPort = 'PortfolioBreakdownRepositoryPort';

export interface PortfolioBreakdownRepositoryPort {
    aggregate(
        userId: number,
        dimension: BreakdownDimension,
        selectedColors?: string[]
    ): Promise<PortfolioBreakdownSlice[]>;
}

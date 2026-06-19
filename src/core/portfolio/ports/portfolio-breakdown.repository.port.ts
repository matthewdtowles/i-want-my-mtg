import {
    BreakdownDimension,
    PortfolioBreakdownCard,
    PortfolioBreakdownSlice,
} from '../portfolio-breakdown.entity';

export const PortfolioBreakdownRepositoryPort = 'PortfolioBreakdownRepositoryPort';

export interface PortfolioBreakdownRepositoryPort {
    aggregate(
        userId: number,
        dimension: BreakdownDimension,
        selectedColors?: string[]
    ): Promise<PortfolioBreakdownSlice[]>;

    /**
     * The cards inside a single breakdown slice (drill-down). `key` is the
     * slice key produced by {@link aggregate} for the given dimension (set
     * code, rarity, type, cost-basis bucket, or color code). For dimension
     * 'color', `selectedColors` carries the active superset filter so the
     * drill-down honors the same membership semantics as the aggregate.
     */
    listCards(
        userId: number,
        dimension: BreakdownDimension,
        key: string,
        selectedColors?: string[]
    ): Promise<PortfolioBreakdownCard[]>;
}

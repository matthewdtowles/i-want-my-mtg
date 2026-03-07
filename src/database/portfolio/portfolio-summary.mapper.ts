import { PortfolioSummary } from 'src/core/portfolio/portfolio-summary.entity';
import { PortfolioSummaryOrmEntity } from './portfolio-summary.orm-entity';

export class PortfolioSummaryMapper {
    static toCore(orm: PortfolioSummaryOrmEntity): PortfolioSummary {
        return new PortfolioSummary({
            userId: orm.userId,
            totalValue: Number(orm.totalValue),
            totalCost: orm.totalCost != null ? Number(orm.totalCost) : null,
            totalRealizedGain: orm.totalRealizedGain != null ? Number(orm.totalRealizedGain) : null,
            totalCards: orm.totalCards,
            totalQuantity: orm.totalQuantity,
            computedAt: orm.computedAt instanceof Date ? orm.computedAt : new Date(orm.computedAt),
            refreshesToday: orm.refreshesToday,
            lastRefreshDate:
                orm.lastRefreshDate instanceof Date
                    ? orm.lastRefreshDate
                    : new Date(orm.lastRefreshDate),
        });
    }

    static toOrmEntity(entity: PortfolioSummary): PortfolioSummaryOrmEntity {
        const orm = new PortfolioSummaryOrmEntity();
        orm.userId = entity.userId;
        orm.totalValue = entity.totalValue;
        orm.totalCost = entity.totalCost;
        orm.totalRealizedGain = entity.totalRealizedGain;
        orm.totalCards = entity.totalCards;
        orm.totalQuantity = entity.totalQuantity;
        orm.computedAt = entity.computedAt;
        orm.refreshesToday = entity.refreshesToday;
        orm.lastRefreshDate = entity.lastRefreshDate;
        return orm;
    }
}

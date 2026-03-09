import { PortfolioCardPerformance } from 'src/core/portfolio/portfolio-card-performance.entity';
import { PortfolioCardPerformanceOrmEntity } from './portfolio-card-performance.orm-entity';

export class PortfolioCardPerformanceMapper {
    static toCore(orm: PortfolioCardPerformanceOrmEntity): PortfolioCardPerformance {
        return new PortfolioCardPerformance({
            id: orm.id,
            userId: orm.userId,
            cardId: orm.cardId,
            isFoil: orm.isFoil,
            quantity: orm.quantity,
            totalCost: Number(orm.totalCost),
            averageCost: Number(orm.averageCost),
            currentValue: Number(orm.currentValue),
            unrealizedGain: Number(orm.unrealizedGain),
            realizedGain: Number(orm.realizedGain),
            roiPercent: orm.roiPercent != null ? Number(orm.roiPercent) : null,
            computedAt: orm.computedAt instanceof Date ? orm.computedAt : new Date(orm.computedAt),
        });
    }

    static toOrmEntity(entity: PortfolioCardPerformance): PortfolioCardPerformanceOrmEntity {
        const orm = new PortfolioCardPerformanceOrmEntity();
        if (entity.id) orm.id = entity.id;
        orm.userId = entity.userId;
        orm.cardId = entity.cardId;
        orm.isFoil = entity.isFoil;
        orm.quantity = entity.quantity;
        orm.totalCost = entity.totalCost;
        orm.averageCost = entity.averageCost;
        orm.currentValue = entity.currentValue;
        orm.unrealizedGain = entity.unrealizedGain;
        orm.realizedGain = entity.realizedGain;
        orm.roiPercent = entity.roiPercent;
        orm.computedAt = entity.computedAt;
        return orm;
    }
}

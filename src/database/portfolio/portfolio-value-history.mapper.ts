import { PortfolioValueHistory } from 'src/core/portfolio/portfolio-value-history.entity';
import { PortfolioValueHistoryOrmEntity } from './portfolio-value-history.orm-entity';

export class PortfolioValueHistoryMapper {
    static toCore(orm: PortfolioValueHistoryOrmEntity): PortfolioValueHistory {
        return new PortfolioValueHistory({
            id: orm.id,
            userId: orm.userId ?? orm?.user?.id,
            totalValue: Number(orm.totalValue),
            totalCost: orm.totalCost != null ? Number(orm.totalCost) : null,
            totalCards: orm.totalCards,
            date: orm.date instanceof Date ? orm.date : new Date(orm.date),
        });
    }
}

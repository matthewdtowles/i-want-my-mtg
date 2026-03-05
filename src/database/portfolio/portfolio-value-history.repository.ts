import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PortfolioValueHistory } from 'src/core/portfolio/portfolio-value-history.entity';
import { PortfolioValueHistoryRepositoryPort } from 'src/core/portfolio/portfolio-value-history.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { Repository } from 'typeorm';
import { PortfolioValueHistoryMapper } from './portfolio-value-history.mapper';
import { PortfolioValueHistoryOrmEntity } from './portfolio-value-history.orm-entity';

@Injectable()
export class PortfolioValueHistoryRepository implements PortfolioValueHistoryRepositoryPort {
    private readonly LOGGER = getLogger(PortfolioValueHistoryRepository.name);

    constructor(
        @InjectRepository(PortfolioValueHistoryOrmEntity)
        private readonly repository: Repository<PortfolioValueHistoryOrmEntity>
    ) {
        this.LOGGER.debug(`Instantiated.`);
    }

    async findByUser(userId: number, days?: number): Promise<PortfolioValueHistory[]> {
        this.LOGGER.debug(`Finding portfolio history for user ${userId}, days: ${days}.`);
        const qb = this.repository
            .createQueryBuilder('pvh')
            .where('pvh.user_id = :userId', { userId })
            .orderBy('pvh.date', 'ASC');

        if (days != null && days > 0) {
            qb.andWhere('pvh.date >= CURRENT_DATE - :days::int', { days });
        }

        const results = await qb.getMany();
        return results.map(PortfolioValueHistoryMapper.toCore);
    }
}

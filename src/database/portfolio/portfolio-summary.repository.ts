import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PortfolioSummary } from 'src/core/portfolio/portfolio-summary.entity';
import { PortfolioSummaryRepositoryPort } from 'src/core/portfolio/ports/portfolio-summary.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { EntityManager, Repository } from 'typeorm';
import { PortfolioSummaryMapper } from './portfolio-summary.mapper';
import { PortfolioSummaryOrmEntity } from './portfolio-summary.orm-entity';

@Injectable()
export class PortfolioSummaryRepository implements PortfolioSummaryRepositoryPort {
    private readonly LOGGER = getLogger(PortfolioSummaryRepository.name);

    constructor(
        @InjectRepository(PortfolioSummaryOrmEntity)
        private readonly repository: Repository<PortfolioSummaryOrmEntity>
    ) {
        this.LOGGER.debug(`Instantiated.`);
    }

    async findByUser(userId: number): Promise<PortfolioSummary | null> {
        this.LOGGER.debug(`Finding portfolio summary for user ${userId}.`);
        const result = await this.repository.findOne({ where: { userId } });
        return result ? PortfolioSummaryMapper.toCore(result) : null;
    }

    async findByUserForUpdate(
        userId: number,
        manager: EntityManager
    ): Promise<PortfolioSummary | null> {
        this.LOGGER.debug(`Finding portfolio summary for user ${userId} with row lock.`);
        const result = await manager
            .createQueryBuilder(PortfolioSummaryOrmEntity, 'ps')
            .setLock('pessimistic_write')
            .where('ps.user_id = :userId', { userId })
            .getOne();
        return result ? PortfolioSummaryMapper.toCore(result) : null;
    }

    async save(summary: PortfolioSummary, manager?: EntityManager): Promise<PortfolioSummary> {
        this.LOGGER.debug(`Saving portfolio summary for user ${summary.userId}.`);
        const orm = PortfolioSummaryMapper.toOrmEntity(summary);
        const repo = manager ? manager.getRepository(PortfolioSummaryOrmEntity) : this.repository;
        const saved = await repo.save(orm);
        return PortfolioSummaryMapper.toCore(saved);
    }

    getManager(): EntityManager {
        return this.repository.manager;
    }
}

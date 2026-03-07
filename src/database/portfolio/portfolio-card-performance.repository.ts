import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PortfolioCardPerformance } from 'src/core/portfolio/portfolio-card-performance.entity';
import {
    PortfolioCardPerformanceRepositoryPort,
    SetRoiAggregation,
} from 'src/core/portfolio/portfolio-card-performance.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { Repository } from 'typeorm';
import { PortfolioCardPerformanceMapper } from './portfolio-card-performance.mapper';
import { PortfolioCardPerformanceOrmEntity } from './portfolio-card-performance.orm-entity';

@Injectable()
export class PortfolioCardPerformanceRepository implements PortfolioCardPerformanceRepositoryPort {
    private readonly LOGGER = getLogger(PortfolioCardPerformanceRepository.name);

    constructor(
        @InjectRepository(PortfolioCardPerformanceOrmEntity)
        private readonly repository: Repository<PortfolioCardPerformanceOrmEntity>
    ) {
        this.LOGGER.debug(`Instantiated.`);
    }

    async findByUser(
        userId: number,
        sortBy: string,
        limit: number
    ): Promise<PortfolioCardPerformance[]> {
        this.LOGGER.debug(
            `Finding card performance for user ${userId}, sortBy: ${sortBy}, limit: ${limit}.`
        );

        const order: 'ASC' | 'DESC' = sortBy === 'worst' ? 'ASC' : 'DESC';
        const results = await this.repository.find({
            where: { userId },
            order: { unrealizedGain: order, realizedGain: order },
            take: limit,
        });

        return results.map(PortfolioCardPerformanceMapper.toCore);
    }

    async aggregateBySet(userId: number): Promise<SetRoiAggregation[]> {
        this.LOGGER.debug(`Aggregating card performance by set for user ${userId}.`);

        const results = await this.repository.query(
            `
            SELECT
                c.set_code AS "setCode",
                s.name AS "setName",
                COUNT(DISTINCT pcp.card_id)::int AS "cardsHeld",
                SUM(pcp.total_cost)::numeric AS "totalCost",
                SUM(pcp.current_value)::numeric AS "currentValue",
                SUM(pcp.unrealized_gain + pcp.realized_gain)::numeric AS "gain",
                CASE WHEN SUM(pcp.total_cost) > 0
                    THEN ((SUM(pcp.current_value) - SUM(pcp.total_cost)) / SUM(pcp.total_cost) * 100)::numeric
                    ELSE NULL
                END AS "roiPercent"
            FROM portfolio_card_performance pcp
            JOIN card c ON c.id = pcp.card_id
            JOIN "set" s ON s.code = c.set_code
            WHERE pcp.user_id = $1
            GROUP BY c.set_code, s.name
            ORDER BY SUM(pcp.unrealized_gain + pcp.realized_gain) DESC
            `,
            [userId]
        );

        return results.map((row: any) => ({
            setCode: row.setCode,
            setName: row.setName,
            cardsHeld: Number(row.cardsHeld),
            totalCost: Number(row.totalCost),
            currentValue: Number(row.currentValue),
            gain: Number(row.gain),
            roiPercent: row.roiPercent != null ? Number(row.roiPercent) : null,
        }));
    }

    async replaceForUser(userId: number, performances: PortfolioCardPerformance[]): Promise<void> {
        this.LOGGER.debug(
            `Replacing ${performances.length} card performance rows for user ${userId}.`
        );

        await this.repository.manager.transaction(async (manager) => {
            await manager.delete(PortfolioCardPerformanceOrmEntity, { userId });
            if (performances.length > 0) {
                const orms = performances.map(PortfolioCardPerformanceMapper.toOrmEntity);
                await manager.save(PortfolioCardPerformanceOrmEntity, orms);
            }
        });
    }
}

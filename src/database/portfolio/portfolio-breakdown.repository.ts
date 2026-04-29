import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    BreakdownDimension,
    PortfolioBreakdownSlice,
} from 'src/core/portfolio/portfolio-breakdown.entity';
import { PortfolioBreakdownRepositoryPort } from 'src/core/portfolio/ports/portfolio-breakdown.repository.port';
import { InventoryOrmEntity } from 'src/database/inventory/inventory.orm-entity';
import { getLogger } from 'src/logger/global-app-logger';
import { Repository } from 'typeorm';

interface AggregationRow {
    key: string;
    label: string;
    cardCount: string | number;
    itemCount: string | number;
    value: string | number;
}

@Injectable()
export class PortfolioBreakdownRepository implements PortfolioBreakdownRepositoryPort {
    private readonly LOGGER = getLogger(PortfolioBreakdownRepository.name);

    constructor(
        @InjectRepository(InventoryOrmEntity)
        private readonly inventoryRepo: Repository<InventoryOrmEntity>
    ) {}

    async aggregate(
        userId: number,
        dimension: BreakdownDimension
    ): Promise<PortfolioBreakdownSlice[]> {
        if (dimension === 'cost-basis') {
            return this.aggregateCostBasis(userId);
        }
        const config = this.dimensionConfig(dimension);
        this.LOGGER.debug(`Aggregating portfolio by ${dimension} for user ${userId}.`);

        const rows = (await this.inventoryRepo.query(
            `
            SELECT
                ${config.keyExpr} AS "key",
                ${config.labelExpr} AS "label",
                COUNT(DISTINCT i.card_id)::int AS "cardCount",
                SUM(i.quantity)::int AS "itemCount",
                COALESCE(SUM(i.quantity * (CASE WHEN i.foil THEN p.foil ELSE p.normal END)), 0)::numeric AS "value"
            FROM inventory i
            JOIN card c ON i.card_id = c.id
            ${config.extraJoins}
            LEFT JOIN price p ON p.card_id = c.id
                AND p.date = (SELECT MAX(p2.date) FROM price p2 WHERE p2.card_id = c.id)
            WHERE i.user_id = $1
            GROUP BY ${config.keyExpr}, ${config.labelExpr}
            ORDER BY "value" DESC NULLS LAST
            `,
            [userId]
        )) as AggregationRow[];

        return rows.map(
            (r) =>
                new PortfolioBreakdownSlice({
                    key: String(r.key ?? ''),
                    label: String(r.label ?? r.key ?? ''),
                    cardCount: Number(r.cardCount) || 0,
                    itemCount: Number(r.itemCount) || 0,
                    value: Number(r.value) || 0,
                })
        );
    }

    private dimensionConfig(dimension: BreakdownDimension): {
        keyExpr: string;
        labelExpr: string;
        extraJoins: string;
    } {
        switch (dimension) {
            case 'set':
                return {
                    keyExpr: 'c.set_code',
                    labelExpr: 's.name',
                    extraJoins: 'JOIN set s ON s.code = c.set_code',
                };
            case 'rarity':
                return {
                    keyExpr: 'c.rarity::text',
                    labelExpr: 'c.rarity::text',
                    extraJoins: '',
                };
            case 'type':
                return {
                    keyExpr: `COALESCE(NULLIF(SPLIT_PART(c.type, ' —', 1), ''), 'Unknown')`,
                    labelExpr: `COALESCE(NULLIF(SPLIT_PART(c.type, ' —', 1), ''), 'Unknown')`,
                    extraJoins: '',
                };
            case 'format':
                return {
                    keyExpr: `l.format::text`,
                    labelExpr: `INITCAP(l.format::text)`,
                    extraJoins: `JOIN legality l ON l.card_id = c.id AND l.status = 'legal'`,
                };
        }
    }

    private async aggregateCostBasis(userId: number): Promise<PortfolioBreakdownSlice[]> {
        this.LOGGER.debug(`Aggregating portfolio by cost-basis for user ${userId}.`);
        const rows = (await this.inventoryRepo.query(
            `
            WITH bucketed AS (
                SELECT
                    CASE
                        WHEN unrealized_gain > 0 THEN 'gain'
                        WHEN unrealized_gain < 0 THEN 'loss'
                        ELSE 'flat'
                    END AS bucket,
                    quantity,
                    current_value,
                    card_id
                FROM portfolio_card_performance
                WHERE user_id = $1
            )
            SELECT
                bucket AS "key",
                CASE bucket
                    WHEN 'gain' THEN 'Unrealized Gainers'
                    WHEN 'loss' THEN 'Unrealized Losers'
                    ELSE 'At Cost'
                END AS "label",
                COUNT(DISTINCT card_id)::int AS "cardCount",
                SUM(quantity)::int AS "itemCount",
                COALESCE(SUM(current_value), 0)::numeric AS "value"
            FROM bucketed
            GROUP BY bucket
            ORDER BY "value" DESC NULLS LAST
            `,
            [userId]
        )) as AggregationRow[];

        return rows.map(
            (r) =>
                new PortfolioBreakdownSlice({
                    key: String(r.key ?? ''),
                    label: String(r.label ?? r.key ?? ''),
                    cardCount: Number(r.cardCount) || 0,
                    itemCount: Number(r.itemCount) || 0,
                    value: Number(r.value) || 0,
                })
        );
    }
}

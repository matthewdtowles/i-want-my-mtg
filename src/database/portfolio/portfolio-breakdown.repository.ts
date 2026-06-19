import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
    BreakdownDimension,
    COLOR_LABELS,
    PortfolioBreakdownCard,
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

interface CardRow {
    cardId: string;
    name: string;
    setCode: string;
    number: string;
    scryfallId: string | null;
    rarity: string;
    quantity: string | number;
    value: string | number;
}

// Latest price per card, joined as a LATERAL subquery (matches aggregate()).
const LATEST_PRICE_JOIN = `
    LEFT JOIN LATERAL (
        SELECT p2.normal, p2.foil
        FROM price p2
        WHERE p2.card_id = c.id
        ORDER BY p2.date DESC
        LIMIT 1
    ) p ON TRUE`;

// Card-level columns shared by every drill-down query. Foil/non-foil rows of
// the same card collapse into one entry via GROUP BY.
const CARD_SELECT = `
    c.id AS "cardId",
    c.name AS "name",
    c.set_code AS "setCode",
    c.number AS "number",
    c.scryfall_id AS "scryfallId",
    c.rarity::text AS "rarity"`;
const CARD_GROUP_BY = `c.id, c.name, c.set_code, c.number, c.scryfall_id, c.rarity`;

@Injectable()
export class PortfolioBreakdownRepository implements PortfolioBreakdownRepositoryPort {
    private readonly LOGGER = getLogger(PortfolioBreakdownRepository.name);

    constructor(
        @InjectRepository(InventoryOrmEntity)
        private readonly inventoryRepo: Repository<InventoryOrmEntity>
    ) {}

    async aggregate(
        userId: number,
        dimension: BreakdownDimension,
        selectedColors: string[] = []
    ): Promise<PortfolioBreakdownSlice[]> {
        if (dimension === 'cost-basis') {
            return this.aggregateCostBasis(userId);
        }
        if (dimension === 'color') {
            return this.aggregateColor(userId, selectedColors);
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
            LEFT JOIN LATERAL (
                SELECT p2.normal, p2.foil
                FROM price p2
                WHERE p2.card_id = c.id
                ORDER BY p2.date DESC
                LIMIT 1
            ) p ON TRUE
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
                    extraJoins: 'JOIN "set" s ON s.code = c.set_code',
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
            case 'cost-basis':
                throw new Error(
                    "dimensionConfig does not support 'cost-basis'; use aggregateCostBasis() instead."
                );
            default:
                throw new Error(`Unsupported breakdown dimension: ${dimension}`);
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

    /**
     * Value grouped by color identity. A card belongs to every color it
     * contains (a W/U card lands in both the W and U rows), so rows overlap
     * and intentionally sum past the portfolio total. Cards with no color
     * identity (or not yet ingested, NULL) group under 'C' (Colorless).
     *
     * selectedColors applies a superset filter: passing ['W','U'] keeps only
     * cards whose identity contains both (a W/U/R card still qualifies). 'C'
     * filters to colorless cards and is ignored when real colors are selected.
     */
    private async aggregateColor(
        userId: number,
        selectedColors: string[]
    ): Promise<PortfolioBreakdownSlice[]> {
        this.LOGGER.debug(
            `Aggregating portfolio by color for user ${userId} (filter: ${selectedColors.join(',') || 'none'}).`
        );
        const colored = selectedColors.filter((c) => c !== 'C');
        const params: unknown[] = [userId];
        let filterSql = '';
        if (colored.length > 0) {
            params.push(colored);
            filterSql = `AND c.colors @> $${params.length}::text[]`;
        } else if (selectedColors.includes('C')) {
            filterSql = 'AND (c.colors IS NULL OR cardinality(c.colors) = 0)';
        }

        const rows = (await this.inventoryRepo.query(
            `
            SELECT
                col AS "key",
                COUNT(DISTINCT i.card_id)::int AS "cardCount",
                SUM(i.quantity)::int AS "itemCount",
                COALESCE(SUM(i.quantity * (CASE WHEN i.foil THEN p.foil ELSE p.normal END)), 0)::numeric AS "value"
            FROM inventory i
            JOIN card c ON i.card_id = c.id
            CROSS JOIN LATERAL unnest(
                CASE
                    WHEN c.colors IS NULL OR cardinality(c.colors) = 0 THEN ARRAY['C']
                    ELSE c.colors
                END
            ) AS col
            LEFT JOIN LATERAL (
                SELECT p2.normal, p2.foil
                FROM price p2
                WHERE p2.card_id = c.id
                ORDER BY p2.date DESC
                LIMIT 1
            ) p ON TRUE
            WHERE i.user_id = $1
            ${filterSql}
            GROUP BY col
            ORDER BY "value" DESC NULLS LAST
            `,
            params
        )) as AggregationRow[];

        return rows.map(
            (r) =>
                new PortfolioBreakdownSlice({
                    key: String(r.key ?? ''),
                    label: COLOR_LABELS[String(r.key)] ?? String(r.key ?? ''),
                    cardCount: Number(r.cardCount) || 0,
                    itemCount: Number(r.itemCount) || 0,
                    value: Number(r.value) || 0,
                })
        );
    }

    async listCards(
        userId: number,
        dimension: BreakdownDimension,
        key: string,
        selectedColors: string[] = []
    ): Promise<PortfolioBreakdownCard[]> {
        if (!key) {
            return [];
        }
        if (dimension === 'cost-basis') {
            return this.listCostBasisCards(userId, key);
        }
        if (dimension === 'color') {
            return this.listColorCards(userId, key, selectedColors);
        }

        // The slice key is exactly the grouping expression aggregate() emitted,
        // so we filter on the same expression to recover that slice's cards.
        const filterExpr = this.dimensionConfig(dimension).keyExpr;
        this.LOGGER.debug(`Listing ${dimension} cards (key=${key}) for user ${userId}.`);

        const rows = (await this.inventoryRepo.query(
            `
            SELECT
                ${CARD_SELECT},
                SUM(i.quantity)::int AS "quantity",
                COALESCE(SUM(i.quantity * (CASE WHEN i.foil THEN p.foil ELSE p.normal END)), 0)::numeric AS "value"
            FROM inventory i
            JOIN card c ON i.card_id = c.id
            ${LATEST_PRICE_JOIN}
            WHERE i.user_id = $1 AND ${filterExpr} = $2
            GROUP BY ${CARD_GROUP_BY}
            ORDER BY "value" DESC NULLS LAST, c.name ASC
            `,
            [userId, key]
        )) as CardRow[];

        return rows.map((r) => this.toCard(r));
    }

    private async listCostBasisCards(
        userId: number,
        bucket: string
    ): Promise<PortfolioBreakdownCard[]> {
        this.LOGGER.debug(`Listing cost-basis cards (bucket=${bucket}) for user ${userId}.`);
        const rows = (await this.inventoryRepo.query(
            `
            SELECT
                ${CARD_SELECT},
                SUM(perf.quantity)::int AS "quantity",
                COALESCE(SUM(perf.current_value), 0)::numeric AS "value"
            FROM portfolio_card_performance perf
            JOIN card c ON perf.card_id = c.id
            WHERE perf.user_id = $1
              AND (CASE
                    WHEN perf.unrealized_gain > 0 THEN 'gain'
                    WHEN perf.unrealized_gain < 0 THEN 'loss'
                    ELSE 'flat'
                  END) = $2
            GROUP BY ${CARD_GROUP_BY}
            ORDER BY "value" DESC NULLS LAST, c.name ASC
            `,
            [userId, bucket]
        )) as CardRow[];

        return rows.map((r) => this.toCard(r));
    }

    /**
     * Cards inside one color slice. `key` is a single color code: a real color
     * (W/U/B/R/G) keeps cards whose identity contains it; 'C' keeps colorless
     * cards. `selectedColors` re-applies the active superset filter so the
     * drill-down stays consistent with the aggregate row the user clicked.
     */
    private async listColorCards(
        userId: number,
        key: string,
        selectedColors: string[]
    ): Promise<PortfolioBreakdownCard[]> {
        this.LOGGER.debug(`Listing color cards (key=${key}) for user ${userId}.`);
        const params: unknown[] = [userId];
        let membershipSql: string;
        if (key === 'C') {
            membershipSql = '(c.colors IS NULL OR cardinality(c.colors) = 0)';
        } else {
            params.push([key]);
            membershipSql = `c.colors @> $${params.length}::text[]`;
        }

        const colored = selectedColors.filter((c) => c !== 'C');
        let filterSql = '';
        if (colored.length > 0) {
            params.push(colored);
            filterSql = `AND c.colors @> $${params.length}::text[]`;
        } else if (selectedColors.includes('C')) {
            filterSql = 'AND (c.colors IS NULL OR cardinality(c.colors) = 0)';
        }

        const rows = (await this.inventoryRepo.query(
            `
            SELECT
                ${CARD_SELECT},
                SUM(i.quantity)::int AS "quantity",
                COALESCE(SUM(i.quantity * (CASE WHEN i.foil THEN p.foil ELSE p.normal END)), 0)::numeric AS "value"
            FROM inventory i
            JOIN card c ON i.card_id = c.id
            ${LATEST_PRICE_JOIN}
            WHERE i.user_id = $1 AND ${membershipSql}
            ${filterSql}
            GROUP BY ${CARD_GROUP_BY}
            ORDER BY "value" DESC NULLS LAST, c.name ASC
            `,
            params
        )) as CardRow[];

        return rows.map((r) => this.toCard(r));
    }

    private toCard(r: CardRow): PortfolioBreakdownCard {
        return new PortfolioBreakdownCard({
            cardId: String(r.cardId ?? ''),
            name: String(r.name ?? ''),
            setCode: String(r.setCode ?? ''),
            number: String(r.number ?? ''),
            scryfallId: r.scryfallId ? String(r.scryfallId) : '',
            rarity: String(r.rarity ?? ''),
            quantity: Number(r.quantity) || 0,
            value: Number(r.value) || 0,
        });
    }
}

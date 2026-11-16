import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Card } from 'src/core/card/card.entity';
import { PriceFinish, PriceMoverRow } from 'src/core/card/price-mover.entity';
import { CardRepositoryPort } from 'src/core/card/ports/card.repository.port';
import { PriceCalculationPolicy } from 'src/core/pricing/price-calculation.policy';
import { PriceMoverQueryOptions } from 'src/core/query/price-mover-query-options.dto';
import { Finish, SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SET_CARD_SORTS, SortOptions } from 'src/core/query/sort-options.enum';
import { latestPriceCondition } from 'src/database/query/latest-price.sql';
import { QueryBuilderHelper } from 'src/database/query/query-builder.helper';
import { getLogger } from 'src/logger/global-app-logger';
import { buildScryfallImagePath } from 'src/shared/utils/scryfall-image.util';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CardMapper } from './card.mapper';
import { CardOrmEntity } from './card.orm-entity';

@Injectable()
export class CardRepository implements CardRepositoryPort {
    readonly TABLE = 'card';
    private readonly LOGGER = getLogger(CardRepository.name);
    private readonly DEFAULT_RELATIONS: string[] = ['set', 'legalities', 'prices'];

    private readonly queryHelper = new QueryBuilderHelper<CardOrmEntity>({
        table: this.TABLE,
        defaultSort: SortOptions.NUMBER,
        allowedSorts: SET_CARD_SORTS,
    });

    private readonly queryHelperPriceDesc = new QueryBuilderHelper<CardOrmEntity>({
        table: this.TABLE,
        defaultSort: SortOptions.PRICE,
        defaultSortDesc: true,
        allowedSorts: SET_CARD_SORTS,
    });

    constructor(
        @InjectRepository(CardOrmEntity) protected readonly repository: Repository<CardOrmEntity>
    ) {
        this.LOGGER.debug(`Instantiated.`);
    }

    async totalCards(): Promise<number> {
        const result = await this.repository.query(`SELECT COUNT(*) AS total FROM ${this.TABLE}`);
        return Number(result[0]?.total ?? 0);
    }

    async findById(id: string, relations: string[]): Promise<Card | null> {
        this.LOGGER.debug(
            `Finding card by id: ${id}, relations: ${relations ?? this.DEFAULT_RELATIONS}.`
        );
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            .where(`${this.TABLE}.id = :id`, { id });
        this.applyRelationJoins(qb, relations ?? this.DEFAULT_RELATIONS);
        const ormCard = await qb.getOne();
        this.LOGGER.debug(`Card ${ormCard ? 'found' : 'not found'} for id: ${id}.`);
        return ormCard ? CardMapper.toCore(ormCard) : null;
    }

    async findByIds(
        ids: string[],
        options?: { includeLatestPrice?: boolean; includeSet?: boolean }
    ): Promise<Card[]> {
        this.LOGGER.debug(`Finding ${ids.length} cards by ids.`);
        if (ids.length === 0) return [];
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            .where(`${this.TABLE}.id IN (:...ids)`, { ids });
        if (options?.includeLatestPrice) {
            qb.leftJoinAndSelect(
                `${this.TABLE}.prices`,
                'prices',
                latestPriceCondition('prices', 'card')
            );
        }
        if (options?.includeSet) {
            qb.leftJoinAndSelect(`${this.TABLE}.set`, 'set');
        }
        const ormCards = await qb.getMany();
        const cards = ormCards.map(CardMapper.toCore);
        this.LOGGER.debug(`Found ${cards.length} cards by ids.`);
        return cards;
    }

    async findBySet(code: string, options: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Finding cards by set code: ${code}.`);
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            .leftJoinAndSelect(
                `${this.TABLE}.prices`,
                'prices',
                latestPriceCondition('prices', 'card')
            )
            .where(`${this.TABLE}.setCode = :code`, { code });

        if (options.baseOnly) {
            qb.andWhere(`${this.TABLE}.inMain = :inMain`, { inMain: true });
        }
        this.applyCatalogFilters(qb, options, { skipSetCode: true });

        this.queryHelper.applyOptions(qb, options);
        const results = (await qb.getMany()).map(CardMapper.toCore);
        this.LOGGER.debug(`Found ${results.length} cards for set ${code}.`);
        return results;
    }

    async findWithName(name: string, options: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Finding cards with name: ${name}.`);
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            .leftJoinAndSelect(
                `${this.TABLE}.prices`,
                'prices',
                latestPriceCondition('prices', 'card')
            )
            // The set is joined so callers can name the printing's set, not just
            // its code — the API's printings list has no set context of its own.
            .leftJoinAndSelect(`${this.TABLE}.set`, 'set')
            .where(`${this.TABLE}.name = :name`, { name });

        // Use price-desc helper for "other printings" sorted by value. Many printings
        // share a price (hundreds of basic lands), so card.id breaks ties: Postgres
        // doesn't promise tied rows the same order from one page's query to the next.
        this.queryHelperPriceDesc.applyPagination(qb, options);
        this.queryHelperPriceDesc.applyOrdering(qb, options);
        qb.addOrderBy(`${this.TABLE}.id`, 'ASC');

        const cards = (await qb.getMany()).map(CardMapper.toCore);
        this.LOGGER.debug(`Found ${cards.length} cards with name: ${name}.`);
        return cards;
    }

    async findBySetCodeAndNumber(
        code: string,
        number: string,
        relations: string[]
    ): Promise<Card | null> {
        this.LOGGER.debug(`Finding card by set code ${code} and number ${number}.`);
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            .where(`${this.TABLE}.setCode = :code`, { code })
            .andWhere(`${this.TABLE}.number = :number`, { number });
        this.applyRelationJoins(qb, relations ?? this.DEFAULT_RELATIONS);
        const ormCard = await qb.getOne();
        this.LOGGER.debug(
            `Card ${ormCard ? 'found' : 'not found'} for set ${code} number ${number}.`
        );
        return ormCard ? CardMapper.toCore(ormCard) : null;
    }

    async totalInSet(code: string, options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Counting total cards in set: ${code}.`);
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            .where(`${this.TABLE}.setCode = :code`, { code });

        if (options.baseOnly) {
            qb.andWhere(`${this.TABLE}.inMain = :inMain`, { inMain: true });
        }
        this.applyCatalogFilters(qb, options, { skipSetCode: true });

        this.queryHelper.applyFilters(qb, options.filter);
        const count = await qb.getCount();
        this.LOGGER.debug(`Total cards in set ${code}: ${count}.`);
        return count;
    }

    async totalWithName(name: string): Promise<number> {
        this.LOGGER.debug(`Counting total cards with name: ${name}.`);
        const count = await this.repository.count({ where: { name } });
        this.LOGGER.debug(`Total cards with name ${name}: ${count}.`);
        return count;
    }

    async verifyCardsExist(cardIds: string[]): Promise<Set<string>> {
        this.LOGGER.debug(`Verifying existence of ${cardIds?.length ?? 0} card ids.`);
        if (cardIds.length === 0) {
            return new Set();
        }
        const ormCards: CardOrmEntity[] = await this.repository
            .createQueryBuilder(this.TABLE)
            .select(`${this.TABLE}.id`)
            .where(`${this.TABLE}.id IN (:...ids)`, { ids: cardIds })
            .getMany();
        const found = new Set(ormCards.map((c: CardOrmEntity) => c.id));
        this.LOGGER.debug(
            `Verified ${found.size} existing cards out of ${cardIds.length} provided.`
        );
        return found;
    }

    async searchByName(filter: string, options: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Searching cards by name: ${filter}.`);
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            .leftJoinAndSelect(`${this.TABLE}.set`, 'set');

        this.applySearchFilter(qb, filter);
        this.applyCatalogFilters(qb, options);

        qb.orderBy(`${this.TABLE}.name`, 'ASC', 'NULLS LAST');
        qb.addOrderBy('set.releaseDate', 'DESC', 'NULLS LAST');

        qb.skip((options.page - 1) * options.limit).take(options.limit);
        const results = (await qb.getMany()).map(CardMapper.toCore);
        this.LOGGER.debug(`Search found ${results.length} cards for "${filter}".`);
        return results;
    }

    async totalSearchByName(filter: string, options?: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Counting search results for: ${filter}.`);
        const qb = this.repository.createQueryBuilder(this.TABLE);
        this.applySearchFilter(qb, filter);
        if (options) this.applyCatalogFilters(qb, options);
        const count = await qb.getCount();
        this.LOGGER.debug(`Total search results for "${filter}": ${count}.`);
        return count;
    }

    async searchByNameGrouped(filter: string, options: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Grouped search by name: ${filter}.`);
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            // One row per name: DISTINCT ON keeps the first row of each name in
            // the ORDER BY, so the name-then-newest order below makes the newest
            // printing the representative.
            .distinctOn([`${this.TABLE}.name`])
            .leftJoinAndSelect(`${this.TABLE}.set`, 'set')
            .leftJoinAndSelect(
                `${this.TABLE}.prices`,
                'prices',
                latestPriceCondition('prices', 'card')
            );

        // When a format is supplied, load just that format's legality row (≤1
        // per card, so DISTINCT ON still yields one row per name) so the caller
        // can flag deck legality. Legality is name-level, so the representative's
        // legality applies to every printing of the name.
        if (options.format) {
            qb.leftJoinAndSelect(
                `${this.TABLE}.legalities`,
                'legalities',
                'legalities.format = :groupedFormat',
                { groupedFormat: options.format }
            );
        }

        this.applySearchFilter(qb, filter);
        this.applyCatalogFilters(qb, options, { skipLegality: true });

        // DISTINCT ON requires the leading ORDER BY to be the distinct expression;
        // the remaining terms select the representative printing: newest set,
        // then lowest collector number, then id as a final deterministic
        // tiebreaker so same-name/same-release printings don't flip arbitrarily.
        qb.orderBy(`${this.TABLE}.name`, 'ASC', 'NULLS LAST');
        qb.addOrderBy('set.releaseDate', 'DESC', 'NULLS LAST');
        qb.addOrderBy(`${this.TABLE}.sortNumber`, 'ASC', 'NULLS LAST');
        qb.addOrderBy(`${this.TABLE}.id`, 'ASC');

        // Raw limit/offset (not skip/take) so pagination applies to the
        // DISTINCT ON result rather than triggering TypeORM's id-subquery path.
        qb.limit(options.limit).offset((options.page - 1) * options.limit);
        const results = (await qb.getMany()).map(CardMapper.toCore);
        this.LOGGER.debug(`Grouped search found ${results.length} names for "${filter}".`);
        return results;
    }

    async totalSearchByNameGrouped(filter: string, options?: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Counting grouped search results for: ${filter}.`);
        const qb = this.repository.createQueryBuilder(this.TABLE);
        this.applySearchFilter(qb, filter);
        if (options) this.applyCatalogFilters(qb, options, { skipLegality: true });
        const raw = await qb
            .select(`COUNT(DISTINCT ${this.TABLE}.name)`, 'cnt')
            .getRawOne<{ cnt: string }>();
        const count = parseInt(raw?.cnt ?? '0', 10);
        this.LOGGER.debug(`Total grouped search results for "${filter}": ${count}.`);
        return count;
    }

    /**
     * Public catalog filters used by the RapidAPI search and per-set listings:
     * `setCode`, `rarity`, `type` substring, and `format`+`legality` (joined to
     * the `legality` table on the format-scoped composite key, no row duplication).
     * `skipSetCode` lets per-set callers ignore a redundant filter from the query.
     */
    private applyCatalogFilters(
        qb: SelectQueryBuilder<CardOrmEntity>,
        options: SafeQueryOptions,
        opts: { skipSetCode?: boolean; skipLegality?: boolean } = {}
    ): void {
        if (!opts.skipSetCode && options.setCode) {
            qb.andWhere(`${this.TABLE}.setCode = :filterSetCode`, {
                filterSetCode: options.setCode,
            });
        }
        if (options.rarity) {
            qb.andWhere(`${this.TABLE}.rarity = :rarity`, { rarity: options.rarity });
        }
        if (options.type) {
            qb.andWhere(`${this.TABLE}.type ILIKE :typeFilter`, {
                typeFilter: `%${options.type}%`,
            });
        }
        // `skipLegality` lets the grouped (deck-building) search use `format` to
        // annotate legality without filtering out illegal cards - a deck builder
        // wants to see every matching card and have the illegal ones flagged.
        if (!opts.skipLegality && options.format && options.legality) {
            qb.innerJoin(
                'legality',
                'lg',
                `lg.card_id = ${this.TABLE}.id AND lg.format = :format AND lg.status = :legality`,
                { format: options.format, legality: options.legality }
            );
        }
    }

    private applySearchFilter(qb: SelectQueryBuilder<CardOrmEntity>, filter: string): void {
        filter
            .split(' ')
            .filter((f) => f.length > 0)
            .forEach((fragment, i) =>
                qb.andWhere(
                    `(${this.TABLE}.name ILIKE :search${i} OR ${this.TABLE}.flavorName ILIKE :search${i})`,
                    { [`search${i}`]: `%${fragment}%` }
                )
            );
    }

    async findByNameAndSetCode(name: string, setCode: string): Promise<Card[]> {
        this.LOGGER.debug(`Finding cards by name "${name}" in set ${setCode}.`);
        const ormCards = await this.repository
            .createQueryBuilder(this.TABLE)
            .leftJoinAndSelect(
                `${this.TABLE}.prices`,
                'prices',
                latestPriceCondition('prices', 'card')
            )
            .where(`LOWER(${this.TABLE}.name) = LOWER(:name)`, { name })
            .andWhere(`${this.TABLE}.setCode = :setCode`, { setCode })
            .getMany();
        const cards = ormCards.map(CardMapper.toCore);
        this.LOGGER.debug(`Found ${cards.length} cards for name "${name}" in set ${setCode}.`);
        return cards;
    }

    async findCoverImagesForSets(setCodes: string[]): Promise<Map<string, string>> {
        if (setCodes.length === 0) return new Map();
        this.LOGGER.debug(`Finding cover images for ${setCodes.length} sets.`);
        // One query for the whole page of sets, not one per set. DISTINCT ON
        // takes the first row per set under the ORDER BY, so the cover is the
        // set's most valuable card (#628) — the chase card people recognize,
        // rather than whatever happens to be numbered 001.
        //
        // `inMain` leads so a pricey promo or variant can't outbid the base card
        // it is a printing of, while a set with no main cards at all still gets a
        // cover. Value is the same expression the rest of the app calls a card's
        // value (normal, falling back to foil); cards with no price row COALESCE
        // to 0 and lose to any priced card.
        //
        // sortNumber breaks ties, so a set with no prices at all resolves to its
        // opening main-set card — not its opening card outright, which is what
        // this returned before #628. The two differ only when a set's lowest
        // sortNumber sits outside the main run.
        //
        // Built through the query builder rather than raw SQL so the column names
        // come from the entity metadata. There is no `img_src` column to select:
        // migration 038 dropped it, and `imgSrc` is now derived from `scryfallId`
        // the same way CardMapper does it.
        const rows = await this.repository
            .createQueryBuilder(this.TABLE)
            .select([`${this.TABLE}.setCode`, `${this.TABLE}.scryfallId`])
            .leftJoin(`${this.TABLE}.prices`, 'p', latestPriceCondition('p', this.TABLE))
            .distinctOn([`${this.TABLE}.setCode`])
            .where(`${this.TABLE}.setCode IN (:...setCodes)`, { setCodes })
            .andWhere(`${this.TABLE}.scryfallId IS NOT NULL`)
            .orderBy(`${this.TABLE}.setCode`, 'ASC')
            .addOrderBy(`${this.TABLE}.inMain`, 'DESC')
            .addOrderBy(PriceCalculationPolicy.cardValueExpression(false), 'DESC')
            .addOrderBy(`${this.TABLE}.sortNumber`, 'ASC')
            .getMany();
        this.LOGGER.debug(`Found ${rows.length} cover images.`);
        return new Map(rows.map((r) => [r.setCode, buildScryfallImagePath(r.scryfallId)]));
    }

    async findBySetCodeAndNumbers(pairs: { setCode: string; number: string }[]): Promise<Card[]> {
        if (pairs.length === 0) return [];
        // Group by set so each set is one `number IN (...)` query, run in
        // parallel — a handful of queries instead of one per pair.
        const numbersBySet = new Map<string, Set<string>>();
        for (const { setCode, number } of pairs) {
            if (!numbersBySet.has(setCode)) numbersBySet.set(setCode, new Set());
            numbersBySet.get(setCode).add(number);
        }
        const groups = await Promise.all(
            [...numbersBySet].map(([setCode, numbers]) =>
                this.repository
                    .createQueryBuilder(this.TABLE)
                    .leftJoinAndSelect(
                        `${this.TABLE}.prices`,
                        'prices',
                        latestPriceCondition('prices', 'card')
                    )
                    .where(`${this.TABLE}.setCode = :setCode`, { setCode })
                    .andWhere(`${this.TABLE}.number IN (:...numbers)`, {
                        numbers: [...numbers],
                    })
                    .getMany()
            )
        );
        return groups.flat().map(CardMapper.toCore);
    }

    async findByNameSetPairs(pairs: { name: string; setCode: string }[]): Promise<Card[]> {
        if (pairs.length === 0) return [];
        // Group by set so each set is one case-insensitive `name IN (...)` query.
        const namesBySet = new Map<string, Set<string>>();
        for (const { name, setCode } of pairs) {
            if (!namesBySet.has(setCode)) namesBySet.set(setCode, new Set());
            namesBySet.get(setCode).add(name.toLowerCase());
        }
        const groups = await Promise.all(
            [...namesBySet].map(([setCode, names]) =>
                this.repository
                    .createQueryBuilder(this.TABLE)
                    .leftJoinAndSelect(
                        `${this.TABLE}.prices`,
                        'prices',
                        latestPriceCondition('prices', 'card')
                    )
                    .where(`${this.TABLE}.setCode = :setCode`, { setCode })
                    .andWhere(`LOWER(${this.TABLE}.name) IN (:...names)`, {
                        names: [...names],
                    })
                    .getMany()
            )
        );
        return groups.flat().map(CardMapper.toCore);
    }

    /**
     * The `price` row averages two vendors' retail prices, and when one vendor is
     * missing for a day the average jumps to the other vendor's price and back. On
     * 2026-11-12 that made Nicol Bolas, the Ravager (M19) read +42% for the week while
     * its daily price went 18, 25, 18, 25, 25, 18, 18, 18, 25, and most of the
     * biggest "movers" looked like it. So a finish whose daily price both rose and
     * fell by FLIP_STEP (10%) or more in a day over the week is a flip: a real move
     * goes one way.
     *
     * Only a weekly move of FLIP_STEP or more is checked. A flip distorts the weekly
     * change only when the week's start and end land on different vendors, which is a
     * big change; checking every row instead cost 0.8s on the full catalog.
     *
     * This reads a week of history for each of the tens of thousands of big moves,
     * which took 1-5s per movers request on prod when it ran inside that query, so it
     * runs on its own and the service caches it.
     *
     * JIT is off for the query: the planner overestimates the per-row history check
     * and spent 330ms compiling a query that runs in 250ms without it.
     */
    async findFlippingPrices(): Promise<PriceFinish[]> {
        const FLIP_STEP = 0.1;
        const sql = `
            WITH moves AS (
                SELECT p.card_id, p.date, f.finish
                FROM price p
                CROSS JOIN LATERAL (VALUES
                    ('normal', p.normal, p.normal_change_weekly),
                    ('foil', p.foil, p.foil_change_weekly)
                ) AS f(finish, price, change)
                WHERE f.price - f.change > 0
                    AND ABS(f.change) >= (f.price - f.change) * ${FLIP_STEP}
                    AND NOT EXISTS (
                        SELECT 1 FROM price p2 WHERE p2.card_id = p.card_id AND p2.date > p.date
                    )
            )
            SELECT m.card_id, m.finish
            FROM moves m
            WHERE EXISTS (
                SELECT 1
                FROM (
                    SELECT
                        CASE m.finish WHEN 'normal' THEN ph.normal ELSE ph.foil END AS value,
                        LAG(CASE m.finish WHEN 'normal' THEN ph.normal ELSE ph.foil END)
                            OVER (ORDER BY ph.date) AS prev
                    FROM price_history ph
                    WHERE ph.card_id = m.card_id AND ph.date >= m.date - 7
                ) d
                WHERE d.prev > 0
                HAVING bool_or(d.value >= d.prev * ${1 + FLIP_STEP})
                    AND bool_or(d.value <= d.prev / ${1 + FLIP_STEP})
            )`;

        const raw: { card_id: string; finish: Finish }[] =
            await this.repository.manager.transaction(async (manager) => {
                await manager.query('SET LOCAL jit = off');
                return manager.query(sql);
            });
        return raw.map((r) => ({ cardId: r.card_id, finish: r.finish }));
    }

    /**
     * Ranks each finish of each printing by its stored weekly change, leaving out
     * the `flipping` finishes (see findFlippingPrices).
     *
     * Cards from a set released in the NEW_SET_DAYS before the price date are left
     * out too. A set is listed at a placeholder price before release, so on
     * 2026-11-16, three days after Star Trek came out, its cards filled the top of
     * the list: Warship Flight Crew read $0.35 -> $8.89, +2440%. That is the market
     * finding a price, not a move.
     *
     * The catalog filters mirror applyCatalogFilters, written as raw SQL because the
     * finishes are unpacked with a LATERAL VALUES list.
     */
    async findPriceMovers(
        options: PriceMoverQueryOptions,
        flipping: PriceFinish[]
    ): Promise<{ rows: PriceMoverRow[]; total: number }> {
        const NEW_SET_DAYS = 14;
        const params: unknown[] = [
            options.minPrice,
            flipping.map((f) => f.cardId),
            flipping.map((f) => f.finish),
        ];
        const where: string[] = [
            options.direction === 'up' ? 'f.change > 0' : 'f.change < 0',
            'f.price - f.change > 0',
            'GREATEST(f.price, f.price - f.change) >= $1',
            `s.release_date <= p.date - ${NEW_SET_DAYS}`,
            'NOT EXISTS (SELECT 1 FROM price p2 WHERE p2.card_id = p.card_id AND p2.date > p.date)',
        ];
        let legalityJoin = '';
        if (options.finish) {
            params.push(options.finish);
            where.push(`f.finish = $${params.length}`);
        }
        if (options.setCode) {
            params.push(options.setCode);
            where.push(`c.set_code = $${params.length}`);
        }
        if (options.rarity) {
            params.push(options.rarity);
            where.push(`c.rarity = $${params.length}`);
        }
        if (options.type) {
            params.push(`%${options.type}%`);
            where.push(`c.type ILIKE $${params.length}`);
        }
        if (options.format && options.legality) {
            params.push(options.format, options.legality);
            legalityJoin = `JOIN legality lg ON lg.card_id = c.id AND lg.format = $${params.length - 1} AND lg.status = $${params.length}`;
        }
        const rank = options.by === 'amount' ? 'm.change' : 'm.change / (m.price - m.change)';
        const order = options.direction === 'up' ? 'DESC' : 'ASC';
        params.push(options.limit, (options.page - 1) * options.limit);

        const sql = `
            WITH moves AS (
                SELECT p.card_id, f.finish, f.price, f.change
                FROM price p
                JOIN card c ON c.id = p.card_id
                JOIN "set" s ON s.code = c.set_code
                ${legalityJoin}
                CROSS JOIN LATERAL (VALUES
                    ('normal', p.normal, p.normal_change_weekly),
                    ('foil', p.foil, p.foil_change_weekly)
                ) AS f(finish, price, change)
                WHERE ${where.join(' AND ')}
            )
            SELECT m.card_id, m.finish, m.price, m.change,
                m.price - m.change AS previous_price,
                ROUND(m.change / (m.price - m.change) * 100, 1) AS change_percent,
                COUNT(*) OVER () AS total
            FROM moves m
            WHERE NOT EXISTS (
                SELECT 1
                FROM unnest($2::varchar[], $3::text[]) AS fl(card_id, finish)
                WHERE fl.card_id = m.card_id AND fl.finish = m.finish
            )
            ORDER BY ${rank} ${order}, m.card_id, m.finish
            LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const raw: {
            card_id: string;
            finish: Finish;
            price: string;
            change: string;
            previous_price: string;
            change_percent: string;
            total: string;
        }[] = await this.repository.query(sql, params);
        return {
            rows: raw.map((r) => ({
                cardId: r.card_id,
                finish: r.finish,
                price: Number(r.price),
                previousPrice: Number(r.previous_price),
                change: Number(r.change),
                changePercent: Number(r.change_percent),
            })),
            total: Number(raw[0]?.total ?? 0),
        };
    }

    private applyRelationJoins(qb: SelectQueryBuilder<CardOrmEntity>, relations: string[]): void {
        for (const rel of relations) {
            if (rel === 'prices') {
                qb.leftJoinAndSelect(
                    `${this.TABLE}.prices`,
                    'prices',
                    latestPriceCondition('prices', 'card')
                );
            } else {
                qb.leftJoinAndSelect(`${this.TABLE}.${rel}`, rel);
            }
        }
    }
}

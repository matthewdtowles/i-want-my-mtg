import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Card } from 'src/core/card/card.entity';
import { CardRepositoryPort } from 'src/core/card/ports/card.repository.port';
import { Format } from 'src/core/card/format.enum';
import { PriceCalculationPolicy } from 'src/core/pricing/price-calculation.policy';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { SET_CARD_SORTS, SortOptions } from 'src/core/query/sort-options.enum';
import { BaseRepository } from 'src/database/base.repository';
import { latestPriceCondition } from 'src/database/query/latest-price.sql';
import { QueryBuilderHelper } from 'src/database/query/query-builder.helper';
import { getLogger } from 'src/logger/global-app-logger';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CardMapper } from './card.mapper';
import { CardOrmEntity } from './card.orm-entity';
import { LegalityOrmEntity } from './legality.orm-entity';

@Injectable()
export class CardRepository extends BaseRepository<CardOrmEntity> implements CardRepositoryPort {
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
        @InjectRepository(CardOrmEntity) protected readonly repository: Repository<CardOrmEntity>,
        @InjectRepository(LegalityOrmEntity)
        protected readonly legalityRepository: Repository<LegalityOrmEntity>
    ) {
        super();
        this.LOGGER.debug(`Instantiated.`);
    }

    async save(cards: Card[]): Promise<number> {
        this.LOGGER.debug(`Saving ${cards?.length ?? 0} cards.`);
        const ormCards: CardOrmEntity[] = cards.map((card: Card) => CardMapper.toOrmEntity(card));
        const saved = await this.repository.save(ormCards);
        const count = saved?.length ?? 0;
        this.LOGGER.debug(`Saved ${count} cards.`);
        return count;
    }

    async findById(uuid: string, _relations: string[]): Promise<Card | null> {
        this.LOGGER.debug(
            `Finding card by id: ${uuid}, relations: ${_relations ?? this.DEFAULT_RELATIONS}.`
        );
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            .where(`${this.TABLE}.id = :id`, { id: uuid });
        this.applyRelationJoins(qb, _relations ?? this.DEFAULT_RELATIONS);
        const ormCard = await qb.getOne();
        this.LOGGER.debug(`Card ${ormCard ? 'found' : 'not found'} for id: ${uuid}.`);
        return ormCard ? CardMapper.toCore(ormCard) : null;
    }

    async findByIds(ids: string[], options?: { includeLatestPrice?: boolean }): Promise<Card[]> {
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
            .where(`${this.TABLE}.name = :name`, { name });

        // Use price-desc helper for "other printings" sorted by value
        this.queryHelperPriceDesc.applyPagination(qb, options);
        this.queryHelperPriceDesc.applyOrdering(qb, options);

        const cards = (await qb.getMany()).map(CardMapper.toCore);
        this.LOGGER.debug(`Found ${cards.length} cards with name: ${name}.`);
        return cards;
    }

    async findBySetCodeAndNumber(
        code: string,
        number: string,
        _relations: string[]
    ): Promise<Card | null> {
        this.LOGGER.debug(`Finding card by set code ${code} and number ${number}.`);
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            .where(`${this.TABLE}.setCode = :code`, { code })
            .andWhere(`${this.TABLE}.number = :number`, { number });
        this.applyRelationJoins(qb, _relations ?? this.DEFAULT_RELATIONS);
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

    async totalValueForSet(
        code: string,
        includeFoil: boolean,
        baseOnly: boolean = true
    ): Promise<number> {
        this.LOGGER.debug(
            `Calculating total value for set ${code}${includeFoil ? ' with foils' : ''}.`
        );
        const selectExpr = PriceCalculationPolicy.cardValueExpression(includeFoil);
        const result = await this.repository.query(
            `
            SELECT COALESCE(SUM(${selectExpr}), 0) AS total_value
            FROM card c
            JOIN price p ON p.card_id = c.id
            WHERE c.set_code = $1
            AND c.in_main = $2
            `,
            [code, baseOnly]
        );
        const total = Number(result[0]?.total_value ?? 0);
        this.LOGGER.debug(`Total value for set ${code}: ${total}.`);
        return total;
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

    async delete(id: string): Promise<void> {
        this.LOGGER.debug(`Deleting card with id: ${id}.`);
        await this.repository.delete(id);
        this.LOGGER.debug(`Deleted card with id: ${id}.`);
    }

    async searchByName(filter: string, options: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Searching cards by name: ${filter}.`);
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            .leftJoinAndSelect(`${this.TABLE}.set`, 'set');

        this.applySearchFilter(qb, filter);
        this.applyCatalogFilters(qb, options);

        qb.orderBy(`${this.TABLE}.name`, this.ASC, this.NULLS_LAST);
        qb.addOrderBy('set.releaseDate', this.DESC, this.NULLS_LAST);

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
        qb.orderBy(`${this.TABLE}.name`, this.ASC, this.NULLS_LAST);
        qb.addOrderBy('set.releaseDate', this.DESC, this.NULLS_LAST);
        qb.addOrderBy(`${this.TABLE}.sortNumber`, this.ASC, this.NULLS_LAST);
        qb.addOrderBy(`${this.TABLE}.id`, this.ASC);

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

    async findBySetCodeAndNumbers(
        pairs: { setCode: string; number: string }[]
    ): Promise<Card[]> {
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

    async deleteLegality(cardId: string, format: Format): Promise<void> {
        this.LOGGER.debug(`Deleting legality for card ${cardId} format ${format}.`);
        await this.legalityRepository.delete({ cardId, format });
        this.LOGGER.debug(`Deleted legality for card ${cardId} format ${format}.`);
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

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card } from "src/core/card/card.entity";
import { CardRepositoryPort } from "src/core/card/card.repository.port";
import { Format } from "src/core/card/format.enum";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { SortOptions } from "src/core/query/sort-options.enum";
import { BaseRepository } from "src/database/base.repository";
import { getLogger } from "src/logger/global-app-logger";
import { Repository } from "typeorm";
import { CardMapper } from "./card.mapper";
import { CardOrmEntity } from "./card.orm-entity";
import { LegalityOrmEntity } from "./legality.orm-entity";


@Injectable()
export class CardRepository extends BaseRepository<CardOrmEntity> implements CardRepositoryPort {

    readonly TABLE = "card";
    private readonly LOGGER = getLogger(CardRepository.name);
    private readonly DEFAULT_RELATIONS: string[] = ["set", "legalities", "prices"];

    constructor(
        @InjectRepository(CardOrmEntity) protected readonly repository: Repository<CardOrmEntity>,
        @InjectRepository(LegalityOrmEntity) protected readonly legalityRepository: Repository<LegalityOrmEntity>,
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
        this.LOGGER.debug(`Finding card by id: ${uuid}, relations: ${_relations ?? this.DEFAULT_RELATIONS}.`);
        const ormCard: CardOrmEntity = await this.repository.findOne({
            where: { id: uuid },
            relations: _relations ?? this.DEFAULT_RELATIONS,
        });
        this.LOGGER.debug(`Card ${ormCard ? "found" : "not found"} for id: ${uuid}.`);
        return ormCard ? CardMapper.toCore(ormCard) : null;
    }

    async findBySet(code: string, options: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Finding cards by set code: ${code}, options: ${JSON.stringify(options)}.`);
        const qb = this.repository.createQueryBuilder(this.TABLE)
            .leftJoinAndSelect(`${this.TABLE}.prices`, "prices")
            .where(`${this.TABLE}.setCode = :code`, { code });
        this.addFilters(qb, options.filter);
        this.addPagination(qb, options);
        this.addOrdering(qb, options, SortOptions.NUMBER);
        const results = (await qb.getMany()).map((item: CardOrmEntity) => (CardMapper.toCore(item)));
        this.LOGGER.debug(`Found ${results.length} cards for set ${code}.`);
        return results;
    }

    async findWithName(name: string, options: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Finding cards with name: ${name}, options: ${JSON.stringify(options)}.`);
        const qb = this.repository.createQueryBuilder(this.TABLE)
            .leftJoinAndSelect(`${this.TABLE}.prices`, "prices")
            .where(`${this.TABLE}.name = :name`, { name });
        this.addPagination(qb, options);
        this.addOrdering(qb, options, SortOptions.PRICE, true);
        const cards = (await qb.getMany()).map((card: CardOrmEntity) => CardMapper.toCore(card));
        this.LOGGER.debug(`Found ${cards.length} cards with name: ${name}.`);
        return cards;
    }

    async findBySetCodeAndNumber(code: string, number: string, _relations: string[]): Promise<Card | null> {
        this.LOGGER.debug(`Finding card by set code ${code} and number ${number}, relations: ${_relations ?? this.DEFAULT_RELATIONS}.`);
        const ormCard: CardOrmEntity = await this.repository.findOne({
            where: {
                set: { code, },
                number,
            },
            relations: _relations ?? this.DEFAULT_RELATIONS,
        });
        this.LOGGER.debug(`Card ${ormCard ? "found" : "not found"} for set ${code} number ${number}.`);
        return ormCard ? CardMapper.toCore(ormCard) : null;
    }

    async totalInSet(code: string, options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Counting total cards in set: ${code}, options: ${JSON.stringify(options)}.`);
        const qb = this.repository
            .createQueryBuilder(this.TABLE)
            .where(`${this.TABLE}.setCode = :code`, { code });
        this.addFilters(qb, options.filter);
        const count = await qb.getCount();
        this.LOGGER.debug(`Total cards in set ${code}: ${count}.`);
        return count;
    }

    async totalWithName(name: string): Promise<number> {
        this.LOGGER.debug(`Counting total cards with name: ${name}.`);
        const count = await this.repository.count({
            where: { name }
        });
        this.LOGGER.debug(`Total cards with name ${name}: ${count}.`);
        return count;
    }

    async totalValueForSet(code: string, includeFoil: boolean): Promise<number> {
        this.LOGGER.debug(`Calculating total value for set ${code}${includeFoil ? " with foils" : ""}.`);
        const selectExpr = includeFoil
            ? "(COALESCE(p.normal, 0) + COALESCE(p.foil, 0))"
            : "COALESCE(p.normal, 0)";
        const result = await this.repository.query(`
            SELECT COALESCE(SUM(${selectExpr}), 0) AS total_value
            FROM card c
            JOIN price p ON p.card_id = c.id
            WHERE c.set_code = $1
        `, [code]);
        const total = Number(result[0]?.total_value ?? 0);
        this.LOGGER.debug(`Total ${includeFoil} value for set ${code}: ${total}.`);
        return total;
    }

    async verifyCardsExist(cardIds: string[]): Promise<Set<string>> {
        this.LOGGER.debug(`Verifying existence of ${cardIds?.length ?? 0} card ids.`);
        if (0 === cardIds.length) {
            this.LOGGER.debug(`No card ids provided to verify.`);
            return new Set();
        }
        const ormCards: CardOrmEntity[] = await this.repository
            .createQueryBuilder(this.TABLE)
            .select(`${this.TABLE}.id`)
            .where(`${this.TABLE}.id IN (:...ids)`, { ids: cardIds })
            .getMany();
        const found = new Set(ormCards.map((c: CardOrmEntity) => c.id));
        this.LOGGER.debug(`Verified ${found.size} existing cards out of ${cardIds.length} provided.`);
        return found;
    }

    async delete(id: string): Promise<void> {
        this.LOGGER.debug(`Deleting card with id: ${id}.`);
        await this.repository.delete(id);
        this.LOGGER.debug(`Deleted card with id: ${id}.`);
    }

    async deleteLegality(cardId: string, format: Format): Promise<void> {
        this.LOGGER.debug(`Deleting legality for card ${cardId} format ${format}.`);
        await this.legalityRepository.delete({ cardId, format });
        this.LOGGER.debug(`Deleted legality for card ${cardId} format ${format}.`);
    }
}

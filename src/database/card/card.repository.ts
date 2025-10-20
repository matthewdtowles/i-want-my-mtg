import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card } from "src/core/card/card.entity";
import { CardRepositoryPort } from "src/core/card/card.repository.port";
import { Format } from "src/core/card/format.enum";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { BaseRepository } from "src/database/base.repository";
import { Repository } from "typeorm";
import { CardMapper } from "./card.mapper";
import { CardOrmEntity } from "./card.orm-entity";
import { LegalityOrmEntity } from "./legality.orm-entity";


@Injectable()
export class CardRepository extends BaseRepository<CardOrmEntity> implements CardRepositoryPort {

    readonly TABLE = "card";
    private readonly LOGGER: Logger = new Logger(CardRepository.name);
    private readonly DEFAULT_RELATIONS: string[] = ["set", "legalities", "prices"];

    constructor(
        @InjectRepository(CardOrmEntity) private readonly cardRepository: Repository<CardOrmEntity>,
        @InjectRepository(LegalityOrmEntity) private readonly legalityRepository: Repository<LegalityOrmEntity>,
    ) {
        super();
    }

    async save(cards: Card[]): Promise<number> {
        const ormCards: CardOrmEntity[] = cards.map((card: Card) => CardMapper.toOrmEntity(card));
        const saved: CardOrmEntity[] = await this.cardRepository.save(ormCards);
        return saved.length ?? 0;
    }

    async findById(uuid: string, _relations: string[]): Promise<Card | null> {
        const ormCard: CardOrmEntity = await this.cardRepository.findOne({
            where: { id: uuid },
            relations: _relations ?? this.DEFAULT_RELATIONS,
        });
        return ormCard ? CardMapper.toCore(ormCard) : null;
    }

    async findBySet(code: string, options: SafeQueryOptions): Promise<Card[]> {
        const qb = this.cardRepository.createQueryBuilder(this.TABLE)
            .leftJoinAndSelect(`${this.TABLE}.prices`, "prices")
            .where(`${this.TABLE}.setCode = :code`, { code });
        this.addFilters(qb, options.filter);
        qb.skip((options.page - 1) * options.limit).take(options.limit);
        options.sort
            ? qb.orderBy(`${options.sort}`, options.ascend ? this.ASC : this.DESC)
            : qb.orderBy(`${this.TABLE}.order`, this.ASC);
        return (await qb.getMany()).map((item: CardOrmEntity) => (CardMapper.toCore(item)));
    }

    async findWithName(name: string, options: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Find with name: ${name}, options: ${JSON.stringify(options)}`)
        const ormCards: CardOrmEntity[] = await this.cardRepository.find({
            where: { name },
            relations: this.DEFAULT_RELATIONS,
            skip: (options.page - 1) * options.limit,
            take: options.limit,
        }) ?? []
        return ormCards.map((card: CardOrmEntity) => CardMapper.toCore(card));
    }

    async findBySetCodeAndNumber(code: string, number: string, _relations: string[]): Promise<Card | null> {
        const ormCard: CardOrmEntity = await this.cardRepository.findOne({
            where: {
                set: { code, },
                number,
            },
            relations: _relations ?? this.DEFAULT_RELATIONS,
        });
        return ormCard ? CardMapper.toCore(ormCard) : null;
    }

    async totalInSet(code: string, options: SafeQueryOptions): Promise<number> {
        const qb = this.cardRepository
            .createQueryBuilder(this.TABLE)
            .where(`${this.TABLE}.setCode = :code`, { code });
        this.addFilters(qb, options.filter);
        return qb.getCount();
    }

    async totalWithName(name: string): Promise<number> {
        return await this.cardRepository.count({
            where: { name }
        });
    }

    async verifyCardsExist(cardIds: string[]): Promise<Set<string>> {
        if (0 === cardIds.length) return new Set();
        const ormCards: CardOrmEntity[] = await this.cardRepository
            .createQueryBuilder(this.TABLE)
            .select(`${this.TABLE}.id`)
            .where(`${this.TABLE}.id IN (:...ids)`, { ids: cardIds })
            .getMany();
        return new Set(ormCards.map((c: CardOrmEntity) => c.id));
    }

    async delete(id: string): Promise<void> {
        await this.cardRepository.delete(id);
    }

    async deleteLegality(cardId: string, format: Format): Promise<void> {
        await this.legalityRepository.delete({ cardId, format });
    }
}

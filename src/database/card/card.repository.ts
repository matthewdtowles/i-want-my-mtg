import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card } from "src/core/card/card.entity";
import { CardRepositoryPort } from "src/core/card/card.repository.port";
import { Format } from "src/core/card/format.enum";
import { CardMapper } from "src/database/card/card.mapper";
import { CardOrmEntity } from "src/database/card/card.orm-entity";
import { Repository } from "typeorm";
import { LegalityOrmEntity } from "./legality.orm-entity";


@Injectable()
export class CardRepository implements CardRepositoryPort {

    private readonly DEFAULT_RELATIONS: string[] = ["set", "legalities", "prices"];

    constructor(
        @InjectRepository(CardOrmEntity) private readonly cardRepository: Repository<CardOrmEntity>,
        @InjectRepository(LegalityOrmEntity) private readonly legalityRepository: Repository<LegalityOrmEntity>,
    ) { }

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

    async findBySet(code: string, page: number, limit: number, filter?: string): Promise<Card[]> {
        const qb = this.cardRepository.createQueryBuilder("card")
            .leftJoinAndSelect("card.legalities", "legalities")
            .leftJoinAndSelect("card.prices", "prices")
            .where("card.setCode = :code", { code });
        if (filter) {
            const fragments = filter.split(" ").filter(f => f.length > 0);
            fragments.forEach((fragment, i) => {
                qb.andWhere(`card.name ILIKE :fragment${i}`, { [`fragment${i}`]: `%${fragment}%` });
            });
        }
        qb.skip((page - 1) * limit).take(limit);
        qb.orderBy("card.order", "ASC");
        const items = await qb.getMany();
        return items.map((item: CardOrmEntity) => (CardMapper.toCore(item)));
    }

    async findWithName(name: string, page: number, limit: number): Promise<Card[]> {
        const ormCards: CardOrmEntity[] = await this.cardRepository.find({
            where: { name },
            relations: this.DEFAULT_RELATIONS,
            skip: (page - 1) * limit,
            take: limit,
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

    async totalInSet(code: string, filter?: string): Promise<number> {
        const qb = this.cardRepository.createQueryBuilder("card")
            .where("card.setCode = :code", { code });
        if (filter) {
            const fragments = filter.split(" ").filter(f => f.length > 0);
            fragments.forEach((fragment, i) => {
                qb.andWhere(`card.name ILIKE :fragment${i}`, { [`fragment${i}`]: `%${fragment}%` });
            });
        }
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
            .createQueryBuilder("card")
            .select("card.id")
            .where("card.id IN (:...ids)", { ids: cardIds })
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

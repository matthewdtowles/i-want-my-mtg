import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { LegalityOrmEntity } from "./legality.orm-entity";
import { CardMapper } from "src/infrastructure/database/card/card.mapper";
import { Card } from "src/core/card/card.entity";
import { CardRepositoryPort } from "src/core/card/card.repository.port";
import { Format } from "src/core/card/format.enum";
import { CardOrmEntity } from "src/infrastructure/database/card/card.orm-entity";


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

    async findBySet(code: string, page: number, limit: number): Promise<Card[]> {
        const ormCards: CardOrmEntity[] = await this.cardRepository.find({
            where: {
                set: { code },
            },
            order: { order: "ASC", },
            skip: (page - 1) * limit,
            take: limit,
            relations: ["legalities", "prices"],
        }) ?? [];
        return ormCards.map((card: CardOrmEntity) => CardMapper.toCore(card));
    }

    async findAllWithName(name: string): Promise<Card[]> {
        const ormCards: CardOrmEntity[] = await this.cardRepository.find({
            where: { name },
            relations: this.DEFAULT_RELATIONS
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

    async totalInSet(code: string): Promise<number> {
        return this.cardRepository.count({
            where: { set: { code } },
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

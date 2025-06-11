import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card, CardRepositoryPort, Format } from "src/core/card";
import { CardMapper } from "src/infrastructure/database/card/card.mapper";
import { CardOrmEntity } from "src/infrastructure/database/card/card.orm-entity";
import { LegalityOrmEntity } from "src/infrastructure/database/card/legality.orm-entity";
import { In, Repository } from "typeorm";


@Injectable()
export class CardRepository implements CardRepositoryPort {
// TODO: DEFINE MAPPINGS CORE < -- > ORM ENTITY
    private readonly DEFAULT_RELATIONS: string[] = ["set", "legalities", "prices"];

    constructor(
        @InjectRepository(CardOrmEntity) private readonly cardRepository: Repository<CardOrmEntity>,
        @InjectRepository(LegalityOrmEntity) private readonly legalityRepository: Repository<LegalityOrmEntity>,
    ) { }

    async save(cards: Card[]): Promise<Card[]> {
        const ormCards: CardOrmEntity[] = cards.map((card: Card) => CardMapper.toOrmEntity(card));
        const saved: CardOrmEntity[] = await this.cardRepository.save(ormCards);
        // TODO: return boolean or number of saved cards instead??
        return saved.map((card: CardOrmEntity) => {
            return CardMapper.toCore(card);
        });
    }

    async findById(uuid: string, _relations: string[]): Promise<Card | null> {
        const ormCard: CardOrmEntity = await this.cardRepository.findOne({
            where: { id: uuid },
            relations: _relations ?? this.DEFAULT_RELATIONS,
        });
        return ormCard ? CardMapper.toCore(ormCard) : null;
    }

    async findByIds(uuids: string[]): Promise<Card[]> {
        const ormCards: CardOrmEntity[] = await this.cardRepository.find({
            where: { id: In(uuids), },
            select: ["order", "id"],
        });
        return ormCards.map((card: CardOrmEntity) => CardMapper.toCore(card));
    }

    async findAllInSet(code: string): Promise<Card[]> {
        const ormCards: CardOrmEntity[] = await this.cardRepository.find({
            where: {
                set: { code: code, },
            },
            order: { number: "ASC", },
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

    async delete(id: string): Promise<void> {
        await this.cardRepository.delete(id);
    }

    async deleteLegality(cardId: string, format: Format): Promise<void> {
        await this.legalityRepository.delete({ cardId, format });
    }
}

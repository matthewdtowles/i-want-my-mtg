import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card, CardRepositoryPort, Format } from "src/core/card";
import { CardOrmEntity } from "src/infrastructure/database/card/card.orm-entity";
import { LegalityOrmEntity } from "src/infrastructure/database/card/legality.orm-entity";
import { PriceOrmEntity } from "src/infrastructure/database/price/price.orm-entity";
import { In, Repository } from "typeorm";


@Injectable()
export class CardRepository implements CardRepositoryPort {

    private readonly DEFAULT_RELATIONS: string[] = ["set", "legalities", "prices"];

    constructor(
        @InjectRepository(CardOrmEntity) private readonly cardRepository: Repository<CardOrmEntity>,
        @InjectRepository(LegalityOrmEntity) private readonly legalityRepository: Repository<LegalityOrmEntity>,
    ) { }

    async save(cards: CardOrmEntity[]): Promise<Card[]> {
        const saved = await this.cardRepository.save(cards);
        return saved.map((card: CardOrmEntity) => {
            return {
                id: card.id,
                artist: card.artist,
                hasFoil: card.hasFoil,
                hasNonFoil: card.hasNonFoil,
                imgSrc: card.imgSrc,
                isReserved: card.isReserved,
                legalities: card.legalities.map((legality: LegalityOrmEntity) => ({
                    cardId: legality.cardId,
                    format: legality.format,
                    status: legality.status,
                })),
                manaCost: card.manaCost,
                name: card.name,
                number: card.number,
                oracleText: card.oracleText,
                order: card.order,
                prices: card.prices.map((price: PriceOrmEntity) => ({
                    id: price.id,
                    normal: price.normal,
                    foil: price.foil,
                    date: price.date,
                    card: price.card ?? null,
                })),
                rarity: card.rarity,
                set: card.set,
                setCode: card.set.code,
                type: card.type,
            };
        });
    }

    async findAllInSet(code: string): Promise<CardOrmEntity[]> {
        return (await this.cardRepository.find({
            where: {
                set: { code: code, },
            },
            order: { number: "ASC", },
            relations: ["legalities", "prices"],
        })) ?? [];
    }

    async findAllWithName(name: string): Promise<CardOrmEntity[]> {
        return (await this.cardRepository.find({
            where: { name },
            relations: this.DEFAULT_RELATIONS
        })) ?? []
    }

    async findBySetCodeAndNumber(code: string, number: string, _relations: string[]): Promise<Card | null> {
        return await this.cardRepository.findOne({
            where: {
                set: { code, },
                number,
            },
            relations: _relations ?? this.DEFAULT_RELATIONS,
        });
    }

    async findByUuid(uuid: string, _relations: string[]): Promise<Card | null> {
        return await this.cardRepository.findOne({
            where: { id: uuid },
            relations: _relations ?? this.DEFAULT_RELATIONS,
        });
    }

    async findByUuids(uuids: string[]): Promise<Card[]> {
        return await this.cardRepository.find({
            where: { id: In(uuids), },
            select: ["order", "id"],
        });
    }

    async delete(card: Card): Promise<void> {
        // TODO MAP TO ORM ENTITY
        await this.cardRepository.delete(card);
    }

    async deleteLegality(cardId: string, format: Format): Promise<void> {
        await this.legalityRepository.delete({ cardId, format });
    }
}

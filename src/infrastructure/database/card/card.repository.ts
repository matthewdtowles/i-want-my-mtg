import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Card } from "src/core/card";
import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Format } from "src/core/card/api/format.enum";
import { CardOrmEntity } from "src/infrastructure/database/card/card.orm-entity";
import { LegalityOrmEntity } from "src/infrastructure/database/card/legality.orm-entity";
import { PriceOrmEntity } from "src/infrastructure/database/price/price.orm-entity";
import { In, Repository } from "typeorm";


@Injectable()
export class CardRepository implements CardRepositoryPort {

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

    async findAllWithName(_name: string): Promise<CardOrmEntity[]> {
        return (await this.cardRepository.find({
            where: { name: _name, },
            relations: ["set", "legalities", "prices"],
        })) ?? []
    }

    async findBySetCodeAndNumber(
        code: string,
        number: string,
        relations: string[] = ["set", "legalities", "price"]
    ): Promise<Card | null> {
        return await this.cardRepository.findOne({
            where: {
                set: { code, },
                number,
            },
            relations,
        });
    }

    async findByUuid(uuid: string): Promise<Card| null> {
        return await this.cardRepository.findOne({
            where: { id: uuid, },
            relations: ["set", "legalities", "prices"],
        });
    }

    async findByUuids(uuids: string[]): Promise<Card[]> {
        return await this.cardRepository.find({
            where: { id: In(uuids), },
            select: ["order", "id"],
        });
    }

    async delete(card: CardOrmEntity): Promise<void> {
        await this.cardRepository.delete(card);
    }

    async deleteLegality(_cardId: number, _format: Format): Promise<void> {
        await this.legalityRepository.delete({ cardId: _cardId, format: _format });
    }
}

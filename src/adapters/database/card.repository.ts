import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Format } from "src/core/card/api/format.enum";
import { Card } from "src/core/card/card.entity";
import { Legality } from "src/core/card/legality.entity";
import { In, Repository } from "typeorm";


@Injectable()
export class CardRepository implements CardRepositoryPort {
    private readonly LOGGER: Logger = new Logger(CardRepository.name);

    constructor(
        @InjectRepository(Card) private readonly cardRepository: Repository<Card>,
        @InjectRepository(Legality) private readonly legalityRepository: Repository<Legality>,
    ) { }

    async save(cards: Card[]): Promise<Card[]> {
        this.LOGGER.debug(`Save ${cards.length} total cards`);
        return await this.cardRepository.save(cards);
    }

    async findAllInSet(code: string): Promise<Card[]> {
        this.LOGGER.debug(`Find all cards in set ${code}`);
        return (await this.cardRepository.find({
            where: {
                set: { code: code, },
            },
            relations: ["legalities", "price"],
        })) ?? [];
    }

    async findAllWithName(_name: string): Promise<Card[]> {
        this.LOGGER.debug(`Find all cards with name ${_name}`);
        return (await this.cardRepository.find({
            where: { name: _name, },
            relations: ["set", "legalities", "price"],
        })) ?? []
    }

    async findById(_id: number): Promise<Card | null> {
        return await this.cardRepository.findOne({
            where: { id: _id, },
            relations: ["set", "legalities", "price"],
        });
    }

    async findBySetCodeAndNumber(code: string, _number: string): Promise<Card | null> {
        return await this.cardRepository.findOne({
            where: {
                set: { code: code, },
                number: _number,
            },
            relations: ["set", "legalities", "price"],
        });
    }

    async findByUuid(_uuid: string): Promise<Card | null> {
        return await this.cardRepository.findOne({
            where: { uuid: _uuid, },
            relations: ["set", "legalities", "price"],
        });
    }

    async findByUuids(_uuids: string[]): Promise<Card[]> {
        return await this.cardRepository.find({
            where: { uuid: In(_uuids), },
            select: ["id", "uuid"],
        });
    }

    async delete(card: Card): Promise<void> {
        this.LOGGER.debug(`Delete card ${card.id}`);
        await this.cardRepository.delete(card);
    }

    async findLegalities(cardId: number): Promise<Legality[]> {
        const card: Card = await this.cardRepository.findOne({
            where: { id: cardId },
            relations: ["legalities"],
        });
        return card.legalities;
    }

    async saveLegalities(legalities: Legality[]): Promise<Legality[]> {
        this.LOGGER.debug(`Save ${legalities.length} legalities`);
        return await this.legalityRepository.save(legalities);
    }

    async deleteLegality(_cardId: number, _format: Format): Promise<void> {
        this.LOGGER.debug(`Delete legality for card ${_cardId} in format ${_format}`);
        await this.legalityRepository.delete({ cardId: _cardId, format: _format });
    }
}

import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Format } from "src/core/card/api/format.enum";
import { Card } from "src/core/card/card.entity";
import { Legality } from "src/core/card/legality.entity";
import { Timing } from "src/shared/decorators/timing.decorator";
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

    @Timing()
    async findAllInSet(code: string): Promise<Card[]> {
        this.LOGGER.debug(`Find all cards in set ${code}`);
        return (await this.cardRepository.find({
            where: {
                set: { code: code, },
            },
            order: { number: "ASC", },
            relations: ["legalities", "prices"],
        })) ?? [];
    }

    @Timing()
    async findAllWithName(_name: string): Promise<Card[]> {
        this.LOGGER.debug(`Find all cards with name ${_name}`);
        return (await this.cardRepository.find({
            where: { name: _name, },
            relations: ["set", "legalities", "prices"],
        })) ?? []
    }

    async findById(_id: number): Promise<Card | null> {
        return await this.cardRepository.findOne({
            where: { id: _id, },
            relations: ["set", "legalities", "prices"],
        });
    }

    async findBySetCodeAndNumber(
        _code: string,
        _number: string,
        _relations: string[] = ["set", "legalities", "price"]
    ): Promise<Card | null> {
        return await this.cardRepository.findOne({
            where: {
                set: { code: _code, },
                number: _number,
            },
            relations: _relations,
        });
    }

    async findByUuid(_uuid: string): Promise<Card | null> {
        return await this.cardRepository.findOne({
            where: { uuid: _uuid, },
            relations: ["set", "legalities", "prices"],
        });
    }

    @Timing()
    async findByUuids(_uuids: string[]): Promise<Card[]> {
        return await this.cardRepository.find({
            where: { uuid: In(_uuids), },
            select: ["id", "uuid"],
        });
    }

    @Timing()
    async findAllIds(): Promise<number[]> {
        return await this.cardRepository
            .createQueryBuilder("card")
            .select("card.id", "id")
            .getRawMany()
            .then((row) => row.map((r) => r.id));
    }

    async delete(card: Card): Promise<void> {
        this.LOGGER.debug(`Delete card ${card.id}`);
        await this.cardRepository.delete(card);
    }

    async deleteLegality(_cardId: number, _format: Format): Promise<void> {
        this.LOGGER.debug(`Delete legality for card ${_cardId} in format ${_format}`);
        await this.legalityRepository.delete({ cardId: _cardId, format: _format });
    }
}

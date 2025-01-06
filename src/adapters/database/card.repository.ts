import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Card } from "src/core/card/card.entity";
import { Repository } from "typeorm";

@Injectable()
export class CardRepository implements CardRepositoryPort {
    private readonly LOGGER: Logger = new Logger(CardRepository.name);

    constructor(@InjectRepository(Card) private readonly cardRepository: Repository<Card>) { }

    async save(cards: Card[]): Promise<Card[]> {
        this.LOGGER.debug(`Save ${cards.length} total cards`);
        await Promise.all(
            cards.map(async (c) => {
                const existingCard: Card = await this.findByUuid(c.uuid);
                if (existingCard) {
                    c.id = existingCard.id;
                }
            }),
        );
        return await this.cardRepository.save(cards);
    }

    async findAllInSet(code: string): Promise<Card[]> {
        this.LOGGER.debug(`Find all cards in set ${code}`);
        return (await this.cardRepository.find({
            where: {
                set: { code: code, },
            },
        })) ?? [];
    }

    async findAllWithName(_name: string): Promise<Card[]> {
        this.LOGGER.debug(`Find all cards with name ${_name}`);
        return (await this.cardRepository.find({
            where: { name: _name, },
            relations: ["set"],
        })) ?? []
    }

    async findById(_id: number): Promise<Card | null> {
        this.LOGGER.debug(`Find card by id ${_id}`);
        return await this.cardRepository.findOne({
            where: { id: _id, },
            relations: ["set"],
        });
    }

    async findBySetCodeAndNumber(code: string, _number: number,): Promise<Card | null> {
        this.LOGGER.debug(`Find card by set code ${code} and number ${_number}`);
        return await this.cardRepository.findOne({
            where: {
                set: { code: code, },
                number: String(_number),
            },
            relations: ["set"],
        });
    }

    async findByUuid(_uuid: string): Promise<Card | null> {
        // this.LOGGER.debug(`Find card by uuid ${_uuid}`);
        return await this.cardRepository.findOne({
            where: { uuid: _uuid, },
            relations: ["set"],
        });
    }

    async delete(card: Card): Promise<void> {
        this.LOGGER.debug(`Delete card ${card.id}`);
        await this.cardRepository.delete(card);
    }
}

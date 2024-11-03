import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CardRepositoryPort } from "src/core/card/api/card.repository.port";
import { Card } from "src/core/card/card.entity";

@Injectable()
export class CardRepository implements CardRepositoryPort {
  private readonly LOGGER: Logger = new Logger(CardRepository.name);

  constructor(
    @InjectRepository(Card) private readonly cardRepository: Repository<Card>,
  ) { }

  async save(cards: Card[]): Promise<Card[]> {
    this.LOGGER.debug(`Save ${cards.length} total cards`);
    const saveCards: Card[] = [];
    await Promise.all(
      cards.map(async (c) => {
        const existingCard: Card = await this.findByUuid(c.uuid);
        const updatedCard = this.cardRepository.merge(c, existingCard);
        saveCards.push(updatedCard);
      }),
    );
    return (await this.cardRepository.save(cards)) ?? [];
  }

  async findAllInSet(code: string): Promise<Card[]> {
    return (
      (await this.cardRepository.find({
        where: {
          set: {
            code: code,
          },
        },
      })) ?? []
    );
  }

  async findAllWithName(_name: string): Promise<Card[]> {
    return (
      (await this.cardRepository.find({
        where: {
          name: _name,
        },
        relations: ["set"],
      })) ?? []
    );
  }

  async findById(_id: number): Promise<Card | null> {
    return await this.cardRepository.findOne({
      where: {
        id: _id,
      },
      relations: ["set"],
    });
  }

  async findBySetCodeAndNumber(
    code: string,
    _number: number,
  ): Promise<Card | null> {
    return await this.cardRepository.findOne({
      where: {
        set: {
          code: code,
        },
        number: String(_number),
      },
      relations: ["set"],
    });
  }

  async findByUuid(_uuid: string): Promise<Card | null> {
    return await this.cardRepository.findOne({
      where: {
        uuid: _uuid,
      },
      relations: ["set"],
    });
  }

  async delete(card: Card): Promise<void> {
    await this.cardRepository.delete(card);
  }
}

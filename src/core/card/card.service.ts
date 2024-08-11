import { Inject, Injectable } from '@nestjs/common';
import { Card } from './card';
import { CardDataIngestionPort } from './ports/card-data.ingestion.port';
import { CardServicePort } from './ports/card.service.port';
import { CardRepositoryPort } from './ports/card.repository.port';

@Injectable()
export class CardService implements CardServicePort {

    constructor(
        @Inject(CardDataIngestionPort) private readonly ingestionService: CardDataIngestionPort,
        @Inject(CardRepositoryPort) private readonly repository: CardRepositoryPort,
    ) {}


    async create(card: Card): Promise<Card> {
        let foundCard: Card;
        if (await this.repository.cardExists(card)) {
            foundCard = await this.findByUuid(card.uuid);
        } else {
            foundCard = await this.repository.saveCard(card);
        }
        return foundCard;
    }

    async findAllInSet(setCode: string): Promise<Card[]> {
        return await this.repository.findAllInSet(setCode);
    }

    async findAllWithName(name: string): Promise<Card[]> {
        return await this.repository.findAllWithName(name);
    }

    async findById(id: number): Promise<Card> {
        return await this.repository.findById(id);
    }

    async findBySetCodeAndNumber(setCode: string, number: number): Promise<Card> {
        return await this.repository.findBySetCodeAndNumber(setCode, number);
    }

    async findByUuid(uuid: string): Promise<Card> {
        return await this.repository.findByUuid(uuid);
    }

    async update(card: Card): Promise<Card> {
        return await this.repository.saveCard(card);
    }
}

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
        throw new Error('Method not implemented.');
    }

    async findAllInSet(setCode: string): Promise<Card[]> {
        throw new Error('Method not implemented.');
    }

    async findAllWithName(name: string): Promise<Card[]> {
        throw new Error('Method not implemented.');
    }

    async findById(id: string): Promise<Card> {
        throw new Error('Method not implemented.');
    }

    async findBySetCodeAndNumber(setCode: string, number: number): Promise<Card> {
        throw new Error('Method not implemented.');
    }

    async update(card: Card): Promise<Card> {
        throw new Error('Method not implemented.');
    }
}

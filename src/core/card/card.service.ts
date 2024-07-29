import { Inject, Injectable } from '@nestjs/common';
import { Card } from './card.entity';
import { CardDataIngestionPort } from './ports/card-data.ingestion.port';
import { CardRepositoryPort } from './ports/card.repository.port';
import { CardServicePort } from './ports/card.service.port';

@Injectable()
export class CardService implements CardServicePort {

    constructor(
        @Inject('CardDataIngestionPort') private readonly ingestionService: CardDataIngestionPort,
        @Inject('CardRepositoryPort') private readonly repositoryService: CardRepositoryPort,
    ) {}

    async create(card: Card): Promise<boolean> {
        return null;
    }

    async findById(id: string): Promise<Card> {
        return null;
    }

    async findBySetCodeAndNumber(setCode: string, number: number): Promise<Card> {
        return null;
    }

    async findAllWithName(name: string): Promise<Card[]> {
        return null;
    }

    async update(updateCardDto: Card): Promise<boolean> {
        return null;
    }
}

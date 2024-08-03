import { Inject, Injectable } from '@nestjs/common';
import { Card } from './card';
import { CardDataIngestionPort } from './ports/card-data.ingestion.port';
import { CardRepositoryPort } from './ports/card.repository.port.ts';
import { CardServicePort } from './ports/card.service.port';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class CardService implements CardServicePort {

    constructor(
        @Inject('CardDataIngestionPort') private readonly ingestionService: CardDataIngestionPort,
        @InjectRepository(CardRepositoryPort) private readonly repository: CardRepositoryPort,
    ) {}

    async create(card: Card): Promise<Card> {
        return null;
    }

    async findAllInSet(setCode: string): Promise<Card[]> {
        throw new Error('Method not implemented.');
    }

    async findAllWithName(name: string): Promise<Card[]> {
        return null;
    }

    async findById(id: string): Promise<Card> {
        return null;
    }

    async findBySetCodeAndNumber(setCode: string, number: number): Promise<Card> {
        return null;
    }

    async update(updateCardDto: Card): Promise<Card> {
        return null;
    }
}

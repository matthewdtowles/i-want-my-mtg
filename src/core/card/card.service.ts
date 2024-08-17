import { Inject, Injectable } from '@nestjs/common';
import { Card } from './card';
import { CardDataIngestionPort } from './ports/card-data.ingestion.port';
import { CardServicePort } from './ports/card.service.port';
import { CardRepositoryPort } from './ports/card.repository.port';
import { IngestMissingCards } from './ingest-missing-cards.decorator';

@Injectable()
export class CardService implements CardServicePort {

    /**
     * @param repository 
     * @param ingestionService used by Ingest decorator
     */
    constructor(
        @Inject(CardRepositoryPort) private readonly repository: CardRepositoryPort,
        @Inject(CardDataIngestionPort) private readonly ingestionService: CardDataIngestionPort,
    ) {}


    async save(cards: Card[]): Promise<Card[]> {
        return  await this.repository.save(cards);
    }

    @IngestMissingCards()
    async findAllInSet(setCode: string): Promise<Card[]> {
        return await this.repository.findAllInSet(setCode);
    }

    async findAllWithName(name: string): Promise<Card[]> {
        return await this.repository.findAllWithName(name);
    }

    async findById(id: number): Promise<Card | null> {
        return await this.repository.findById(id);
    }

    @IngestMissingCards()
    async findBySetCodeAndNumber(setCode: string, number: number): Promise<Card> {
        return await this.repository.findBySetCodeAndNumber(setCode, number);
    }

    async findByUuid(uuid: string): Promise<Card | null> {
        return await this.repository.findByUuid(uuid);
    }

}
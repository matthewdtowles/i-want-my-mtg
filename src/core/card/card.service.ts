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

    create(card: Card): Card {
        return null;
    }

    findById(id: string): Card {
        return null;
    }

    findBySetCodeAndNumber(setCode: string, number: number): Card {
        return null;
    }

    findAllWithName(name: string): Card[] {
        return null;
    }

    update(updateCardDto: Card): Card {
        return null;
    }
}

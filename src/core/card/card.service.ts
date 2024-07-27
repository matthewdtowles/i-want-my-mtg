import { Inject, Injectable } from '@nestjs/common';
import { Card } from './entities/card.entity';
import { CardDataIngestionPort } from './ports/card-data.ingestion.port';
import { CardRepositoryPort } from './ports/card.repository.port';

@Injectable()
export class CardService {

    constructor(
        @Inject('CardDataIngestionPort') private readonly ingestionService: CardDataIngestionPort,
        @Inject('CardRepositoryPort') private readonly repositoryService: CardRepositoryPort,
    ) {}

    create(card: Card): Card {
        return new Card();
    }

    findAll(): Card[]{
        return [];
    }

    findOne(id: string): Card {
        return new Card();
    }

    update(updateCardDto: Card): Card {
        return null;
    }

    remove(id: string): void {
    }

 
}

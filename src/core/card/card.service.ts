import { Inject, Injectable } from '@nestjs/common';
import { IngestMissingCards } from '../ingestion/ingestion.decorator';
import { IngestionServicePort } from '../ingestion/ingestion.service.port';
import { Card } from './card.entity';
import { CardMapper } from './card.mapper';
import { CardDto } from './dto/card.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { CardRepositoryPort } from './ports/card.repository.port';
import { CardServicePort } from './ports/card.service.port';

@Injectable()
export class CardService implements CardServicePort {

    /**
     * @param repository 
     * @param ingestionService used by Ingest decorator
     */
    constructor(
        @Inject(CardRepositoryPort) private readonly repository: CardRepositoryPort,
        @Inject(IngestionServicePort) private readonly ingestionService: IngestionServicePort,
    ) { }


    async save(cardDtos: CreateCardDto[] | UpdateCardDto[]): Promise<CardDto[]> {
        const savedCards: Card[] = await this.repository.save(CardMapper.dtosToEntities(cardDtos));
        return CardMapper.entitiesToDtos(savedCards);
    }

    @IngestMissingCards()
    async findAllInSet(setCode: string): Promise<CardDto[]> {
        const foundCards: Card[] = await this.repository.findAllInSet(setCode);
        return CardMapper.entitiesToDtos(foundCards);
    }

    async findAllWithName(name: string): Promise<CardDto[]> {
        const foundCards: Card[] = await this.repository.findAllWithName(name);
        return CardMapper.entitiesToDtos(foundCards);
    }

    async findById(id: number): Promise<CardDto | null> {
        const foundCard: Card = await this.repository.findById(id);
        return CardMapper.entityToDto(foundCard);
    }

    @IngestMissingCards()
    async findBySetCodeAndNumber(setCode: string, number: number): Promise<CardDto> {
        const foundCard: Card = await this.repository.findBySetCodeAndNumber(setCode, number);
        return CardMapper.entityToDto(foundCard);
    }

    async findByUuid(uuid: string): Promise<CardDto | null> {
        const foundCard: Card = await this.repository.findByUuid(uuid);
        return CardMapper.entityToDto(foundCard);
    }

}
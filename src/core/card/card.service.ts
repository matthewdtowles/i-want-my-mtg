import { Inject, Injectable } from "@nestjs/common";
import { Card } from "./card.entity";
import { CardMapper } from "./card.mapper";
import { CardDto } from "./dto/card.dto";
import { CreateCardDto } from "./dto/create-card.dto";
import { UpdateCardDto } from "./dto/update-card.dto";
import { CardRepositoryPort } from "./ports/card.repository.port";
import { CardServicePort } from "./ports/card.service.port";

@Injectable()
export class CardService implements CardServicePort {
    /**
     * @param repository
     * @param mapper
     */
    constructor(
        @Inject(CardRepositoryPort) private readonly repository: CardRepositoryPort,
        @Inject(CardMapper) private readonly mapper: CardMapper,
    ) { }

    async save(cardDtos: CreateCardDto[] | UpdateCardDto[]): Promise<CardDto[]> {
        const savedCards: Card[] = await this.repository.save(this.mapper.dtosToEntities(cardDtos));
        return this.mapper.entitiesToDtos(savedCards);
    }

    async findAllInSet(setCode: string): Promise<CardDto[]> {
        const foundCards: Card[] = await this.repository.findAllInSet(setCode);
        return this.mapper.entitiesToDtos(foundCards);
    }

    async findAllWithName(name: string): Promise<CardDto[]> {
        const foundCards: Card[] = await this.repository.findAllWithName(name);
        return this.mapper.entitiesToDtos(foundCards);
    }

    async findById(id: number): Promise<CardDto | null> {
        const foundCard: Card = await this.repository.findById(id);
        return this.mapper.entityToDto(foundCard);
    }

    async findBySetCodeAndNumber(setCode: string, number: number): Promise<CardDto> {
        const foundCard: Card = await this.repository.findBySetCodeAndNumber(setCode, number);
        return this.mapper.entityToDto(foundCard);
    }

    async findByUuid(uuid: string): Promise<CardDto | null> {
        const foundCard: Card = await this.repository.findByUuid(uuid);
        return this.mapper.entityToDto(foundCard);
    }
}

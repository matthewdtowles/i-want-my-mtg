import { Inject, Injectable, Logger } from "@nestjs/common";
import { Format, LegalityStatus } from "src/core/card/api/legality.dto";
import { CardDto, CardImgType, CreateCardDto, UpdateCardDto } from "./api/card.dto";
import { CardRepositoryPort } from "./api/card.repository.port";
import { CardServicePort } from "./api/card.service.port";
import { Card } from "./card.entity";
import { CardMapper } from "./card.mapper";
import { Legality } from "./legality.entity";

@Injectable()
export class CardService implements CardServicePort {

    private readonly LOGGER = new Logger(CardService.name);

    constructor(
        @Inject(CardRepositoryPort) private readonly repository: CardRepositoryPort,
        @Inject(CardMapper) private readonly mapper: CardMapper,
    ) { }

    async save(cardDtos: CreateCardDto[] | UpdateCardDto[]): Promise<CardDto[]> {
        this.LOGGER.debug(`save ${cardDtos.length} cards`);
        if (!cardDtos || cardDtos.length === 0) {
            return [];
        }
        try {
            const cardsToSave: Card[] = [];
            for (const dto of cardDtos) {
                const legalitiesToSave: Legality[] = [];
                const legalitiesToDelete: Legality[] = [];
                const previouslySavedCard: Card = await this.repository.findBySetCodeAndNumber(dto.setCode, dto.number);
                const card: Card = previouslySavedCard ? { ...previouslySavedCard, ...this.mapper.dtoToEntity(dto) } : this.mapper.dtoToEntity(dto);
                if (this.isValidCard(card)) {
                    for (const legality of card?.legalities) {
                        if (this.isValidLegality(legality)) {
                            legalitiesToSave.push(legality);
                        }
                    }
                    if (previouslySavedCard && previouslySavedCard.legalities) {
                        for (const existingLegality of previouslySavedCard.legalities) {
                            if (!legalitiesToSave.some(l => l.format === existingLegality?.format)) {
                                legalitiesToDelete.push(existingLegality);
                            }
                        }
                    }
                    const legalityDeletionPromises = legalitiesToDelete?.map(l => {
                        this.repository.deleteLegality(l?.cardId, l?.format)
                    });
                    if (legalityDeletionPromises && legalityDeletionPromises.length > 0) {
                        await Promise.all(legalityDeletionPromises);
                    }
                    card.legalities = legalitiesToSave;
                    cardsToSave.push(card);
                }
            }
            const savedCards: Card[] = await this.repository.save(cardsToSave);
            return this.mapper.entitiesToDtos(savedCards, CardImgType.SMALL);
        } catch (error) {
            this.LOGGER.error(`Error saving cards: ${error}`);
        }
        return [];
    }

    private isValidCard(card: Card): boolean {
        return card !== null && card !== undefined;
    }

    private isValidLegality(legality: Legality): boolean {
        return legality && this.isValidFormat(legality.format) && this.isValidStatus(legality.status);
    }

    private isValidFormat(format: string): boolean {
        return Object.values(Format).includes(format?.toLowerCase() as Format);
    }

    private isValidStatus(status: string): boolean {
        return Object.values(LegalityStatus).includes(status?.toLowerCase() as LegalityStatus);
    }

    async findAllInSet(setCode: string): Promise<CardDto[]> {
        this.LOGGER.debug(`findAllInSet ${setCode}`);
        const foundCards: Card[] = await this.repository.findAllInSet(setCode);
        for (const card of foundCards) {
            card.legalities = await this.fillMissingFormats(card);
        }
        return this.mapper.entitiesToDtos(foundCards, CardImgType.SMALL);
    }

    async findAllWithName(name: string): Promise<CardDto[]> {
        this.LOGGER.debug(`findAllWithName ${name}`);
        const foundCards: Card[] = await this.repository.findAllWithName(name);
        for (const card of foundCards) {
            card.legalities = await this.fillMissingFormats(card);
        }
        return this.mapper.entitiesToDtos(foundCards, CardImgType.SMALL);
    }

    async findById(id: number): Promise<CardDto | null> {
        this.LOGGER.debug(`findById ${id}`);
        const foundCard: Card = await this.repository.findById(id);
        if (foundCard) {
            foundCard.legalities = await this.fillMissingFormats(foundCard);
        }
        return this.mapper.entityToDto(foundCard, CardImgType.NORMAL);
    }

    async findBySetCodeAndNumber(setCode: string, number: number): Promise<CardDto> {
        this.LOGGER.debug(`findBySetCodeAndNumber ${setCode} #${number}`);
        const foundCard: Card = await this.repository.findBySetCodeAndNumber(setCode, number);
        if (foundCard) {
            foundCard.legalities = await this.fillMissingFormats(foundCard);
        }
        return this.mapper.entityToDto(foundCard, CardImgType.NORMAL);
    }

    async findByUuid(uuid: string): Promise<CardDto | null> {
        this.LOGGER.debug(`findByUuid ${uuid}`);
        const foundCard: Card = await this.repository.findByUuid(uuid);
        if (foundCard) {
            foundCard.legalities = await this.fillMissingFormats(foundCard);
        }
        return this.mapper.entityToDto(foundCard, CardImgType.NORMAL);
    }

    private async fillMissingFormats(card: Card): Promise<Legality[]> {
        const existingLegalities: Legality[] = card.legalities || [];
        const formats: Format[] = Object.values(Format);
        const filledLegalities: Legality[] = formats.map(format => {
            const existingLegality: Legality | undefined = existingLegalities.find(l => l.format === format);
            if (existingLegality) {
                return existingLegality;
            }
            const newLegality = new Legality();
            newLegality.cardId = card.id;
            newLegality.format = format;
            newLegality.status = "Not Legal";
            return newLegality;
        });
        return filledLegalities;
    }
}

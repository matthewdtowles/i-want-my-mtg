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
            const cardsToSave: Card[] = await this.prepareSave(cardDtos);
            const savedCards: Card[] = await this.repository.save(cardsToSave);
            return this.mapper.entitiesToDtos(savedCards, CardImgType.SMALL);
        } catch (error) {
            this.LOGGER.error(`Error saving cards: ${error}`);
        }
        return [];
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

    async prepareSave(cardDtos: CreateCardDto[] | UpdateCardDto[]): Promise<Card[]> {
        const cardsToSave: Card[] = [];
        // TODO: check each legalities array for validity
        for (const dto of cardDtos) {
            let card: Card = await this.repository.findBySetCodeAndNumber(dto.setCode, Number(dto.number));
            if (!card) {
                card = this.mapper.dtoToEntity(dto);
            } else {
                card = {
                    ...card,
                    ...this.mapper.dtoToEntity(dto),
                };
            }
            await this.updateLegalities(card);
            cardsToSave.push(card);
        }
        return cardsToSave;
    }

    async updateLegalities(card: Card): Promise<void> {
        const existingLegalities: Legality[] = await this.repository.findLegalities(card?.id);
        const inputFormats: Set<string> = this.extractFormats(card?.legalities);
        const legalitiesToDelete: Legality[] = this.identifyLegalitiesToDelete(existingLegalities, inputFormats);
        await this.deleteLegalities(legalitiesToDelete);
    }

    private extractFormats(legalities: Legality[]): Set<string> {
        return new Set(legalities.map((l: Legality) => l.format));
    }

    private identifyLegalitiesToDelete(existingLegalities: Legality[], cardlegalityFormats: Set<string>): Legality[] {
        return existingLegalities?.filter(existingLegality => !cardlegalityFormats.has(existingLegality.format));
    }

    private async deleteLegalities(legalities: Legality[]): Promise<void> {
        const deletePromises = legalities?.map(legality =>
            this.repository.deleteLegality(legality.cardId, legality.format)
        );
        if (deletePromises && deletePromises.length > 0) {
            await Promise.all(deletePromises);
        }
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

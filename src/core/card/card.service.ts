import { Inject, Injectable, Logger } from "@nestjs/common";
import { CardDto } from "src/core/card/api/card.dto";
import { Format } from "src/core/card/api/format.enum";
import { LegalityStatus } from "src/core/card/api/legality.status.enum";
import { CardImgType } from "./api/card.img.type.enum";
import { CardRepositoryPort } from "./api/card.repository.port";
import { CardServicePort } from "./api/card.service.port";
import { CreateCardDto, UpdateCardDto } from "./api/create-card.dto";
import { Card } from "./card.entity";
import { CardMapper } from "./card.mapper";
import { Legality } from "./legality.entity";
import { Timing } from "src/shared/decorators/timing.decorator";

@Injectable()
export class CardService implements CardServicePort {

    private readonly LOGGER = new Logger(CardService.name);

    constructor(
        @Inject(CardRepositoryPort) private readonly repository: CardRepositoryPort,
        @Inject(CardMapper) private readonly mapper: CardMapper,
    ) { }


    @Timing()
    async save(cardDtos: CreateCardDto[] | UpdateCardDto[]): Promise<CardDto[]> {
        this.LOGGER.debug(`save ${cardDtos.length} cards`);
        let savedDtos: CardDto[] = [];
        try {
            const cardsToSave: Card[] = [];
            const relations: string[] = ["legalities"];
            for (const dto of cardDtos) {
                const oldCard: Card = await this.repository.findBySetCodeAndNumber(dto?.setCode, dto?.number, relations); 
                const card: Card = oldCard ? { ...oldCard, ...this.mapper.dtoToEntity(dto) } : this.mapper.dtoToEntity(dto);
                if (!this.isValidCard(card)) {
                    continue;
                }
                const legalitiesToSave: Legality[] = this.extractLegalitiesToSave(card);
                const legalitiesToDelete: Legality[] = this.extractObsoleteLegalities(legalitiesToSave, oldCard);
                this.deleteObsoleteLegalities(legalitiesToDelete);
                card.legalities = legalitiesToSave;
                cardsToSave.push(card);
            }
            const savedCards: Card[] = await this.repository.save(cardsToSave);
            if (Array.isArray(savedCards) && savedCards.length > 0) {
                this.mapper.entitiesToDtos(savedCards, CardImgType.SMALL).forEach(dto => {
                    savedDtos.push(dto);
                });
            }
        } catch (error) {
            const msg = `Error saving cards: ${error.message}`;
            this.LOGGER.error(msg);
        }
        return savedDtos;
    }

    @Timing()
    async findAllInSet(setCode: string): Promise<CardDto[]> {
        this.LOGGER.debug(`findAllInSet ${setCode}`);
        try {
            const foundCards: Card[] = await this.repository.findAllInSet(setCode);
            return this.mapper.entitiesToDtos(foundCards, CardImgType.SMALL);
        } catch (error) {
            // Do not confuse caller with empty result if error occurs
            throw new Error(`Error finding cards in set ${setCode}: ${error.message}`);
        }
    }

    @Timing()
    async findAllWithName(name: string): Promise<CardDto[]> {
        this.LOGGER.debug(`findAllWithName ${name}`);
        const foundCards: Card[] = await this.repository.findAllWithName(name);
        return this.mapper.entitiesToDtos(foundCards, CardImgType.SMALL);
    }

    @Timing()
    async findById(id: number, imgType: CardImgType = CardImgType.NORMAL): Promise<CardDto> {
        this.LOGGER.debug(`findById ${id}`);
        try {
            const foundCard: Card = await this.repository.findById(id);
            return this.mapper.entityToDtoForView(foundCard, imgType);
        } catch (error) {
            // Do not confuse caller with empty result if error occurs
            throw new Error(`Error finding card with id ${id}: ${error.message}`);
        }
    }

    @Timing()
    async findBySetCodeAndNumber(
        setCode: string,
        number: string,
        imgType: CardImgType = CardImgType.NORMAL
    ): Promise<CardDto> {
        this.LOGGER.debug(`findBySetCodeAndNumber ${setCode} #${number}`);
        const relations: string[] = ["set", "legalities", "prices"];
        try {
            const foundCard: Card = await this.repository.findBySetCodeAndNumber(setCode, number, relations);
            return this.mapper.entityToDtoForView(foundCard, imgType);
        } catch (error) {
            // Do not confuse caller with empty result if error occurs
            throw new Error(`Error finding card with setCode ${setCode} and number ${number}: ${error.message}`);
        }
    }

    @Timing()
    async findByUuid(uuid: string, imgType: CardImgType = CardImgType.NORMAL): Promise<CardDto> {
        try {
            const foundCard: Card = await this.repository.findByUuid(uuid);
            return this.mapper.entityToDtoForView(foundCard, imgType);
        } catch (error) {
            // Do not confuse caller with empty result if error occurs
            throw new Error(`Error finding card with uuid ${uuid}: ${error.message}`);
        }
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

    private extractLegalitiesToSave(card: Card): Legality[] {
        return card?.legalities?.map(legality => {
            legality.cardId = card.id;
            if (this.isValidLegality(legality)) {
                return legality;
            }
        });
    }

    private extractObsoleteLegalities(newLegalities: Legality[], oldCard: Card): Legality[] {
        if (Array.isArray(newLegalities)) {
            return oldCard && oldCard.legalities ? oldCard.legalities.filter(existingLegality =>
                !newLegalities.some(l => l.format === existingLegality.format)
            ) : [];
        }
        return [];
    }

    private async deleteObsoleteLegalities(legalitiesToDelete: Legality[]): Promise<void> {
        if (Array.isArray(legalitiesToDelete)) {
            const legalityDeletionPromises = legalitiesToDelete.map((l: Legality) => {
                return this.repository.deleteLegality(l.cardId, l.format);
            });
            await Promise.all(legalityDeletionPromises);
        }
    }
}

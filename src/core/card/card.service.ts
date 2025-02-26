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
        let savedDtos: CardDto[] = [];
        try {
            const cardsToSave: Card[] = [];
            for (const dto of cardDtos) {
                const oldCard: Card = await this.repository.findBySetCodeAndNumber(dto?.setCode, dto?.number);
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
            this.mapper.entitiesToDtos(savedCards, CardImgType.SMALL).forEach(dto => {
                savedDtos.push(dto);
            });
        } catch (error) {
            const msg = `Error saving cards: ${error.message}`;
            this.LOGGER.error(msg);
        }
        return savedDtos;
    }

    async findAllInSet(setCode: string): Promise<CardDto[]> {
        this.LOGGER.debug(`findAllInSet ${setCode}`);
        try {
            const foundCards: Card[] = await this.repository.findAllInSet(setCode);
            return this.mapper.entitiesToDtos(foundCards, CardImgType.SMALL);
        } catch (error) {
            const msg = `Error finding cards in set ${setCode}: ${error.message}`;
            this.LOGGER.error(msg);
            // Do not confuse caller with empty result if error occurs
            throw new Error(msg);
        }
    }

    async findAllWithName(name: string): Promise<CardDto[]> {
        this.LOGGER.debug(`findAllWithName ${name}`);
        const foundCards: Card[] = await this.repository.findAllWithName(name);
        return this.mapper.entitiesToDtos(foundCards, CardImgType.SMALL);
    }

    async findById(id: number, imgType: CardImgType = CardImgType.NORMAL): Promise<CardDto> {
        this.LOGGER.debug(`findById ${id}`);
        try {
            const foundCard: Card = await this.repository.findById(id);
            return this.mapper.entityToDtoForView(foundCard, imgType);
        } catch (error) {
            const msg = `Error finding card with id ${id}: ${error.message}`;
            this.LOGGER.error(msg);
            // Do not confuse caller with empty result if error occurs
            throw new Error(msg);
        }
    }

    async findBySetCodeAndNumber(
        setCode: string,
        number: string,
        imgType: CardImgType = CardImgType.NORMAL
    ): Promise<CardDto> {
        this.LOGGER.debug(`findBySetCodeAndNumber ${setCode} #${number}`);
        try {
            const foundCard: Card = await this.repository.findBySetCodeAndNumber(setCode, number);
            return this.mapper.entityToDtoForView(foundCard, imgType);
        } catch (error) {
            const msg = `Error finding card with setCode ${setCode} and number ${number}: ${error.message}`;
            this.LOGGER.error(msg);
            // Do not confuse caller with empty result if error occurs
            throw new Error(msg);
        }
    }

    async findByUuid(uuid: string, imgType: CardImgType = CardImgType.NORMAL): Promise<CardDto> {
        this.LOGGER.debug(`findByUuid ${uuid}`);
        try {
            const foundCard: Card = await this.repository.findByUuid(uuid);
            return this.mapper.entityToDtoForView(foundCard, imgType);
        } catch (error) {
            const msg = `Error finding card with uuid ${uuid}: ${error.message}`;
            this.LOGGER.error(msg);
            // Do not confuse caller with empty result if error occurs
            throw new Error(msg);
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
        return oldCard && oldCard.legalities ? oldCard.legalities.filter(existingLegality =>
            !newLegalities.some(l => l.format === existingLegality.format)
        ) : [];
    }

    private async deleteObsoleteLegalities(legalitiesToDelete: Legality[]): Promise<void> {
        const legalityDeletionPromises = legalitiesToDelete?.map(l => {
            this.repository.deleteLegality(l.cardId, l.format)
        });
        await Promise.all(legalityDeletionPromises);
    }
}

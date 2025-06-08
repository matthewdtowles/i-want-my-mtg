import { Inject, Injectable, Logger } from "@nestjs/common";
import { CardDto } from "src/core/card/api/card.dto";
import { Format } from "src/core/card/api/format.enum";
import { LegalityStatus } from "src/core/card/api/legality.status.enum";
import { CardImgType } from "./api/card.img.type.enum";
import { CardRepositoryPort } from "./api/card.repository.port";
import { CreateCardDto, UpdateCardDto } from "./api/create-card.dto";
import { Card } from "./card.entity";
import { CardMapper } from "./card.mapper";
import { Legality } from "./legality.entity";


@Injectable()
export class CardService {

    private readonly LOGGER = new Logger(CardService.name);

    constructor(
        @Inject(CardRepositoryPort) private readonly repository: CardRepositoryPort,
        @Inject(CardMapper) private readonly mapper: CardMapper,
    ) { }


    async save(cardDtos: CreateCardDto[] | UpdateCardDto[]): Promise<CardDto[]> {
        let savedDtos: CardDto[] = [];
        try {
            const cardsToSave: Card[] = [];
            const relations: string[] = ["legalities"];
            for (const dto of cardDtos) {
                const oldCard: Card = await this.repository.findBySetCodeAndNumber(dto?.setCode, dto?.number, relations);
                const card: Card = oldCard ? { ...oldCard, ...this.mapper.dtoToEntity(dto) } : this.mapper.dtoToEntity(dto);
                if (null === card || undefined === card) {
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

    async findAllWithName(name: string): Promise<CardDto[]> {
        this.LOGGER.debug(`findAllWithName ${name}`);
        const foundCards: Card[] = await this.repository.findAllWithName(name);
        return this.mapper.entitiesToDtos(foundCards, CardImgType.SMALL);
    }

    async findById(id: string, imgType: CardImgType = CardImgType.NORMAL): Promise<CardDto> {
        this.LOGGER.debug(`findById ${id}`);
        try {
            const foundCard: Card = await this.repository.findByUuid(id);
            return this.mapper.entityToDtoForView(foundCard, imgType);
        } catch (error) {
            // Do not confuse caller with empty result if error occurs
            throw new Error(`Error finding card with id ${id}: ${error.message}`);
        }
    }

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

    private extractLegalitiesToSave(card: Card): Legality[] {
        return card?.legalities?.map(legality => {
            legality.cardId = card.order;
            if (legality
                && Object.values(Format).includes(legality.format?.toLowerCase() as Format)
                && Object.values(LegalityStatus).includes(legality.status?.toLowerCase() as LegalityStatus)
            ) {
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

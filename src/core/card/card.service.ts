import { Inject, Injectable, Logger } from "@nestjs/common";
import {
    Card,
    CardMapper,
    CardRepositoryPort,
    CreateCardDto,
    Format,
    Legality,
    LegalityStatus,
} from "src/core/card";


@Injectable()
export class CardService {

    private readonly LOGGER = new Logger(CardService.name);

    constructor(
        @Inject(CardRepositoryPort) private readonly repository: CardRepositoryPort,
        @Inject(CardMapper) private readonly mapper: CardMapper,
    ) { }

    async save(cardDtos: CreateCardDto[]): Promise<Card[]> {
        let savedEntities: Card[] = [];
        try {
            const cardsToSave: Card[] = [];
            const relations: string[] = ["legalities"];
            for (const dto of cardDtos) {
                const oldCard: Card = await this.repository.findByUuid(dto?.uuid, relations);
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
            savedEntities.push(...savedCards);
        } catch (error) {
            const msg = `Error saving cards: ${error.message}`;
            this.LOGGER.error(msg);
        }
        return savedEntities;
    }

    async findAllWithName(name: string): Promise<Card[]> {
        return await this.repository.findAllWithName(name);
    }

    async findById(id: string): Promise<Card | null> {
        try {
            return await this.repository.findByUuid(id, ["set", "legalities", "prices"]);
        } catch (error) {
            throw new Error(`Error finding card with id ${id}: ${error.message}`);
        }
    }

    async findBySetCodeAndNumber(setCode: string, number: string): Promise<Card> {
        try {
            return await this.repository.findBySetCodeAndNumber(setCode, number, ["set", "legalities", "prices"]);
        } catch (error) {
            throw new Error(`Error finding card with setCode ${setCode} and number ${number}: ${error.message}`);
        }
    }

    private extractLegalitiesToSave(card: Card): Legality[] {
        return card?.legalities?.map(legality => {
            legality.cardId = card.id;
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

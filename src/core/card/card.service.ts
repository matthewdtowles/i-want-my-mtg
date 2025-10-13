import { Inject, Injectable, Logger } from "@nestjs/common";
import { Card } from "src/core/card/card.entity";
import { CardRepositoryPort } from "src/core/card/card.repository.port";
import { Format } from "src/core/card/format.enum";
import { Legality } from "src/core/card/legality.entity";
import { LegalityStatus } from "src/core/card/legality.status.enum";

@Injectable()
export class CardService {

    private readonly LOGGER = new Logger(CardService.name);

    constructor(@Inject(CardRepositoryPort) private readonly repository: CardRepositoryPort) { }

    async save(inputCards: Card[]): Promise<number> {
        let savedEntities: number = 0;
        try {
            const cardsToSave: Card[] = [];
            for (const inCard of inputCards) {
                const oldCard: Card = await this.repository.findById(inCard.id, ["legalities"]);
                const card: Card = oldCard ? { ...oldCard, ...inCard } : inCard;
                if (null === card || undefined === card) {
                    continue;
                }
                const legalitiesToSave: Legality[] = this.extractLegalitiesToSave(card);
                const legalitiesToDelete: Legality[] = this.extractObsoleteLegalities(legalitiesToSave, oldCard);
                this.deleteObsoleteLegalities(legalitiesToDelete);
                card.legalities = legalitiesToSave;
                cardsToSave.push(card);
            }
            if (cardsToSave.length > 0) {
                savedEntities += await this.repository.save(cardsToSave);
            }
        } catch (error) {
            const msg = `Error saving cards: ${error.message}`;
            this.LOGGER.error(msg);
        }
        return savedEntities;
    }

    async findWithName(name: string, page: number, limit: number): Promise<Card[]> {
        try {
            return await this.repository.findWithName(name, page, limit);
        } catch (error) {
            throw new Error(`Error finding cards with name ${name}: ${error.message}`);
        }
    }

    async findBySet(code: string, page: number, limit: number, filter?: string): Promise<Card[]> {
        try {
            return await this.repository.findBySet(code, page, limit, filter);
        } catch (error) {
            throw new Error(`Error finding cards in set ${code}: ${error.message}`);
        }
    }

    async findById(id: string): Promise<Card | null> {
        try {
            return await this.repository.findById(id, ["set", "legalities", "prices"]);
        } catch (error) {
            throw new Error(`Error finding card with id ${id}: ${error.message}`);
        }
    }

    async findBySetCodeAndNumber(code: string, number: string): Promise<Card | null> {
        try {
            return await this.repository.findBySetCodeAndNumber(code, number, ["set", "legalities", "prices"]);
        } catch (error) {
            throw new Error(`Error finding card with set code ${code} and number ${number}: ${error.message}`);
        }
    }

    async totalCardsInSet(setCode: string, filter?: string): Promise<number> {
        try {
            return await this.repository.totalInSet(setCode, filter);
        } catch (error) {
            throw new Error(`Error counting cards in set ${setCode} with filter ${filter}: ${error.message}`);
        }
    }

    async totalWithName(name: string): Promise<number> {
        try {
            return await this.repository.totalWithName(name);
        } catch (error) {
            throw new Error(`Error counting cards with name ${name}: ${error.message}`);
        }
    }

    private extractLegalitiesToSave(card: Card): Legality[] {
        return card?.legalities?.map((leg: Legality) => {
            if (leg && Object.values(Format).includes(leg.format?.toLowerCase() as Format)
                && Object.values(LegalityStatus).includes(leg.status?.toLowerCase() as LegalityStatus)) {
                return new Legality({ ...leg, cardId: card.id });
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

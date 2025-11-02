import { Inject, Injectable } from "@nestjs/common";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { getLogger } from "src/logger/global-app-logger";
import { Card } from "./card.entity";
import { CardRepositoryPort } from "./card.repository.port";
import { Format } from "./format.enum";
import { Legality } from "./legality.entity";
import { LegalityStatus } from "./legality.status.enum";

@Injectable()
export class CardService {

    private readonly LOGGER = getLogger(CardService.name);

    constructor(@Inject(CardRepositoryPort) private readonly repository: CardRepositoryPort) { }

    async save(inputCards: Card[]): Promise<number> {
        this.LOGGER.debug(`Save cards.`);
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
            this.LOGGER.error(`Error saving cards: ${error.message}.`);
        }
        this.LOGGER.debug(`Saved ${savedEntities} cards.`);
        return savedEntities;
    }

    async findWithName(name: string, options: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Find cards with name ${name}.`);
        try {
            const cards = await this.repository.findWithName(name, options);
            this.LOGGER.debug(`Found ${cards?.length} with name ${name}.`);
            return cards;
        } catch (error) {
            throw new Error(`Error finding cards with name ${name}: ${error.message}`);
        }
    }

    async findBySet(code: string, query: SafeQueryOptions): Promise<Card[]> {
        this.LOGGER.debug(`Find cards in set ${code}.`);
        try {
            const cards = await this.repository.findBySet(code, query);
            this.LOGGER.debug(`Found ${cards?.length} in set ${code}.`);
            return cards;
        } catch (error) {
            throw new Error(`Error finding cards in set ${code}: ${error.message}`);
        }
    }

    async findBySetCodeAndNumber(code: string, number: string): Promise<Card | null> {
        this.LOGGER.debug(`Find card no. ${number} in set ${code}.`);
        try {
            const card = await this.repository.findBySetCodeAndNumber(code, number, ["set", "legalities", "prices"]);
            this.LOGGER.debug(`Card no. ${number} in set ${code}: ${card ? card.id : "Not found"}.`);
            return card;
        } catch (error) {
            throw new Error(`Error finding card with set code ${code} and number ${number}: ${error.message}`);
        }
    }

    async totalCardsInSet(setCode: string, options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`Find total number of cards in set ${setCode}.`);
        try {
            const total = await this.repository.totalInSet(setCode, options);
            this.LOGGER.debug(`Total cards in set ${setCode}: ${total}.`);
            return total;
        } catch (error) {
            throw new Error(`Error counting cards in set ${setCode} with filter ${options.filter}: ${error.message}`);
        }
    }

    async totalValueForSet(setCode: string, includeFoil: boolean): Promise<number> {
        this.LOGGER.debug(`Get total value of cards in set ${setCode} ${includeFoil ? "with foils" : ""}.`);
        try {
            const total = await this.repository.totalValueForSet(setCode, includeFoil);
            this.LOGGER.debug(`Total value for set ${setCode} ${includeFoil ? "with foils" : ""} ${total}.`);
            return total;
        } catch (error) {
            throw new Error(`Error getting total value of non-foil cards for set ${setCode}: ${error.message}.`);
        }
    }

    async totalWithName(name: string): Promise<number> {
        this.LOGGER.debug(`Find total number of cards with name ${name}.`);
        try {
            const total = await this.repository.totalWithName(name);
            this.LOGGER.debug(`Total cards with name ${name}: ${total}.`);
            return total;
        } catch (error) {
            throw new Error(`Error counting cards with name ${name}: ${error.message}`);
        }
    }

    private extractLegalitiesToSave(card: Card): Legality[] {
        this.LOGGER.debug(`Extracting legalities to save for card ${card?.id}.`);
        return card?.legalities?.map((leg: Legality) => {
            if (leg && Object.values(Format).includes(leg.format?.toLowerCase() as Format)
                && Object.values(LegalityStatus).includes(leg.status?.toLowerCase() as LegalityStatus)) {
                return new Legality({ ...leg, cardId: card.id });
            }
        });
    }

    private extractObsoleteLegalities(newLegalities: Legality[], oldCard: Card): Legality[] {
        this.LOGGER.debug(`Extracting obsolete legalities from ${oldCard?.id}.`);
        if (Array.isArray(newLegalities)) {
            return oldCard && oldCard.legalities ? oldCard.legalities.filter(existingLegality =>
                !newLegalities.some(l => l.format === existingLegality.format)
            ) : [];
        }
        return [];
    }

    private async deleteObsoleteLegalities(legalitiesToDelete: Legality[]): Promise<void> {
        this.LOGGER.debug(`Deleting ${legalitiesToDelete?.length} obsolete legalities.`);
        if (Array.isArray(legalitiesToDelete)) {
            const legalityDeletionPromises = legalitiesToDelete.map((l: Legality) => {
                return this.repository.deleteLegality(l.cardId, l.format);
            });
            await Promise.all(legalityDeletionPromises);
        }
    }
}

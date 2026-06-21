import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Format } from 'src/core/card/format.enum';
import { getLogger } from 'src/logger/global-app-logger';
import { Deck } from './deck.entity';
import { DeckRepositoryPort } from './ports/deck.repository.port';

@Injectable()
export class DeckService {
    private readonly LOGGER = getLogger(DeckService.name);

    constructor(@Inject(DeckRepositoryPort) private readonly repository: DeckRepositoryPort) {}

    /** A user's decks (with cards), most-recently-updated first. */
    async listDecks(userId: number): Promise<Deck[]> {
        this.LOGGER.debug(`list decks for user ${userId}.`);
        return userId ? this.repository.findByUser(userId) : [];
    }

    async countDecks(userId: number): Promise<number> {
        return userId ? this.repository.countByUser(userId) : 0;
    }

    /** A deck owned by the user (with cards), or null if missing / not theirs. */
    async getDeck(deckId: number, userId: number): Promise<Deck | null> {
        const deck = await this.repository.findById(deckId);
        return deck && deck.userId === userId ? deck : null;
    }

    async createDeck(userId: number, name: string, format?: Format | null): Promise<Deck> {
        const cleanName = (name ?? '').trim();
        if (!cleanName) {
            throw new BadRequestException('Deck name is required.');
        }
        this.LOGGER.debug(`create deck "${cleanName}" for user ${userId}.`);
        return this.repository.create(new Deck({ userId, name: cleanName, format: format ?? null }));
    }

    async updateDeck(
        deckId: number,
        userId: number,
        name: string,
        format?: Format | null
    ): Promise<Deck> {
        await this.assertOwner(deckId, userId);
        const cleanName = (name ?? '').trim();
        if (!cleanName) {
            throw new BadRequestException('Deck name is required.');
        }
        this.LOGGER.debug(`update deck ${deckId} for user ${userId}.`);
        return this.repository.update(
            new Deck({ id: deckId, userId, name: cleanName, format: format ?? null })
        );
    }

    async deleteDeck(deckId: number, userId: number): Promise<void> {
        await this.assertOwner(deckId, userId);
        this.LOGGER.debug(`delete deck ${deckId} for user ${userId}.`);
        await this.repository.delete(deckId);
    }

    /** Add to a card entry: increment quantity, creating the entry if absent. */
    async addCard(
        deckId: number,
        userId: number,
        cardId: string,
        isSideboard: boolean,
        quantity = 1
    ): Promise<void> {
        if (quantity <= 0) {
            return;
        }
        await this.assertOwner(deckId, userId);
        this.LOGGER.debug(`add ${quantity} of ${cardId} (side=${isSideboard}) to deck ${deckId}.`);
        await this.repository.addCard(deckId, cardId, isSideboard, quantity);
    }

    /** Bulk-add card entries (summing quantity on conflict). Used by import / clone. */
    async addCards(
        deckId: number,
        userId: number,
        entries: { cardId: string; isSideboard: boolean; quantity: number }[]
    ): Promise<void> {
        await this.assertOwner(deckId, userId);
        const valid = entries.filter((e) => e.quantity > 0);
        if (valid.length === 0) {
            return;
        }
        await this.repository.addCards(deckId, valid);
    }

    /** Set the absolute quantity for a card entry; quantity <= 0 removes it. */
    async setCardQuantity(
        deckId: number,
        userId: number,
        cardId: string,
        isSideboard: boolean,
        quantity: number
    ): Promise<void> {
        await this.assertOwner(deckId, userId);
        if (quantity <= 0) {
            await this.repository.removeCard(deckId, cardId, isSideboard);
            return;
        }
        await this.repository.setCardQuantity(deckId, cardId, isSideboard, quantity);
    }

    async removeCard(
        deckId: number,
        userId: number,
        cardId: string,
        isSideboard: boolean
    ): Promise<void> {
        await this.assertOwner(deckId, userId);
        await this.repository.removeCard(deckId, cardId, isSideboard);
    }

    /** Throws NotFoundException if the deck is missing or not owned by the user. */
    private async assertOwner(deckId: number, userId: number): Promise<void> {
        const ownerId = await this.repository.getOwnerId(deckId);
        if (ownerId !== userId) {
            throw new NotFoundException(`Deck ${deckId} not found.`);
        }
    }
}

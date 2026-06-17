import { Deck } from '../deck.entity';

export const DeckRepositoryPort = 'DeckRepositoryPort';

/**
 * Persistence for decks (10.4). Decks are addressed by a generated id; card
 * entries are keyed by (deckId, cardId, isSideboard).
 */
export interface DeckRepositoryPort {
    /** A user's decks, most-recently-updated first, each with its cards (card + latest price). */
    findByUser(userId: number): Promise<Deck[]>;

    /** A single deck with its cards (card + set + latest price + legalities), or null. */
    findById(deckId: number): Promise<Deck | null>;

    /** The owning user's id for a deck, or null if the deck does not exist. */
    getOwnerId(deckId: number): Promise<number | null>;

    /** Create a deck; returns it with the generated id. */
    create(deck: Deck): Promise<Deck>;

    /** Update a deck's name/format; returns the updated deck (without cards). */
    update(deck: Deck): Promise<Deck>;

    /** Delete a deck (cascades to its card entries). */
    delete(deckId: number): Promise<void>;

    /**
     * Add `delta` to a card entry, creating it at `delta` if absent
     * (INSERT ... ON CONFLICT DO UPDATE). Returns the resulting quantity.
     */
    addCard(deckId: number, cardId: string, isSideboard: boolean, delta: number): Promise<number>;

    /** Set the absolute quantity for a card entry. */
    setCardQuantity(
        deckId: number,
        cardId: string,
        isSideboard: boolean,
        quantity: number
    ): Promise<void>;

    /** Remove a card entry. */
    removeCard(deckId: number, cardId: string, isSideboard: boolean): Promise<void>;

    /** Count a user's decks. */
    countByUser(userId: number): Promise<number>;
}

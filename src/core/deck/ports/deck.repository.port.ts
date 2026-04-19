import { Deck } from '../deck.entity';
import { DeckCard } from '../deck-card.entity';

export const DeckRepositoryPort = 'DeckRepositoryPort';

export interface DeckSummary {
    deck: Deck;
    cardCount: number;
    sideboardCount: number;
}

/**
 * Persistence layer for deck and deck_card entities.
 */
export interface DeckRepositoryPort {
    /**
     * Create a new deck.
     * @returns the persisted deck with generated id and timestamps
     */
    createDeck(deck: Deck): Promise<Deck>;

    /**
     * Update deck metadata (name, format, description). Does not touch cards.
     */
    updateDeck(deck: Deck): Promise<Deck>;

    /**
     * @returns the deck without cards, or null if not found
     */
    findById(deckId: number): Promise<Deck | null>;

    /**
     * @returns the deck with `cards` populated (including card entity where available)
     */
    findByIdWithCards(deckId: number): Promise<Deck | null>;

    /**
     * @returns decks for the user with main and sideboard counts, ordered by updated_at desc
     */
    findByUser(userId: number): Promise<DeckSummary[]>;

    /**
     * Lightweight list of the user's decks (no counts / no cards). Intended for
     * UI pickers (e.g. the "Add to deck" dropdown) where aggregate counts aren't needed.
     * @returns decks for the user ordered by updated_at desc
     */
    findByUserBasic(userId: number): Promise<Deck[]>;

    /**
     * Delete a deck and all its cards (ON DELETE CASCADE).
     */
    deleteDeck(deckId: number): Promise<void>;

    /**
     * Insert or update a deck_card row with the given quantity. Callers must
     * invoke {@link removeCard} explicitly for removal — this method does not
     * delete rows when quantity is zero.
     */
    upsertCard(entry: DeckCard): Promise<void>;

    /**
     * Remove a single deck_card row.
     */
    removeCard(deckId: number, cardId: string, isSideboard: boolean): Promise<void>;

    /**
     * @returns all cards in the deck (main + sideboard) with card data joined
     */
    findCards(deckId: number): Promise<DeckCard[]>;
}

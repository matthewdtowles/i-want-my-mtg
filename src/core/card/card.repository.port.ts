import { Card } from "src/core/card/card.entity";
import { Format } from "src/core/card/format.enum";

export const CardRepositoryPort = "CardRepositoryPort";

/**
 * Persistence layer for Card entity
 */
export interface CardRepositoryPort {

    /**
     * Create card entities, update if they exist
     *
     * @param {Card[]} cards - Array of card entities to be saved
     * @returns {Promise<number>} - A promise that resolves to the number of saved cards.
     */
    save(cards: Card[]): Promise<number>;

    /**
     * @param {string} id - The unique identifier of the card.
     * @param {string[]} relations - relations to load
     * @returns {Promise<Card | null>} - A promise that resolves to a card entity, null if not found
     */
    findById(id: string, relations: string[]): Promise<Card | null>;

    /**
     * @param {string} code - The unique three-letter set code (primary key).
     * @param {number} page - The page number (1-based index).
     * @param {number} limit - The number of items per page.
     * @param {string} [filter] - Optional filter to apply to card name.
     * @returns {Promise<Card[]>} - A promise that resolves to an array of Card entities.
     */
    findBySet(code: string, page: number, limit: number, filter?: string): Promise<Card[]>;

    /**
     * @param {string} name - of card to find
     * @param {number} page - The page number (1-based index).
     * @param {number} limit - number of cards to return
     * @returns {Promise<Card[]>} - A promise that resolves to an array of Card entities with the given name.
     */
    findWithName(name: string, page: number, limit: number): Promise<Card[]>;

    /**
     * @param {string} code - three letter set code
     * @param {string} number - card number in set
     * @param {string[]} relations - relations to load
     * @returns {Promise<Card | null>} - A promise that resolves to a card entity in set with code and card number in set, null if not found
     */
    findBySetCodeAndNumber(code: string, number: string, relations: string[]): Promise<Card | null>;

    /**
     * @param {string} code - three letter set code
     * @param {string} [filter] - optional filter to apply to card name
     * @returns {Promise<number>} - total number of cards in set with code
     */
    totalInSet(code: string, filter?: string): Promise<number>;

    /**
     * @param {string[]} ids - ids of cards to verify existence
     * @returns {Promise<Set<string>>} - A promise that resolves to a set of card IDs with ID in IDs
     */
    verifyCardsExist(ids: string[]): Promise<Set<string>>;

    /**
     * @param {string} id - The unique identifier of the card to be removed.
     */
    delete(id: string): Promise<void>;

    /**
     * @param {string} cardId - The unique identifier of the card.
     * @param {Format} format - The format for which the legality is to be removed.
     */
    deleteLegality(cardId: string, format: Format): Promise<void>;
}

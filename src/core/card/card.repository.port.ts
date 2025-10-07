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
     * @param cards
     * @returns number of saved cards
     */
    save(cards: Card[]): Promise<number>;

    /**
     * @param id
     * @param relations relations to load
     * @returns card entity with id, null if not found
     */
    findById(id: string, relations: string[]): Promise<Card | null>;

    /**
     * Retrieves Card entities by set code with pagination.
     *
     * @param {string} code - The unique three-letter set code (primary key).
     * @param {number} page - The page number (1-based index).
     * @param {number} limit - The number of items per page.
     * @param {string} [filter] - Optional filter to apply to card name.
     * @returns {Promise<Card[]>} A promise that resolves to an array of Card entities.
     */
    findBySet(code: string, page: number, limit: number, filter?: string): Promise<Card[]>;

    /**
     * @param name
     * @returns card entities with name
     */
    findAllWithName(name: string): Promise<Card[]>;

    /**
     * @param code three letter set code
     * @param number card number in set
     * @param relations relations to load
     * @returns card entity in set with code and card number in set
     */
    findBySetCodeAndNumber(code: string, number: string, relations: string[]): Promise<Card | null>;

    /**
     * @param code three letter set code
     * @param filter optional filter to apply to card name
     * @returns total number of cards in set with code
     */
    totalInSet(code: string, filter?: string): Promise<number>;

    /**
     * @param ids of cards to verify existence
     * @returns Set of card IDs with ID in IDs
     */
    verifyCardsExist(ids: string[]): Promise<Set<string>>;

    /**
     * Remove card entity
     *
     * @param id 
     */
    delete(id: string): Promise<void>;

    /**
     * Remove legality entity
     *
     * @param legality
     */
    deleteLegality(cardId: string, format: Format): Promise<void>;
}

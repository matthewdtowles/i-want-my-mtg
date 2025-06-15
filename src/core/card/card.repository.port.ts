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
     * 
     * @param ids
     * @returns card entities with id in ids, empty array if not found
     */
    findByIds(ids: string[]): Promise<Card[]>;

    /**
     * @param code three letter set code
     * @returns card entities in set with code
     */
    findAllInSet(code: string): Promise<Card[]>;

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

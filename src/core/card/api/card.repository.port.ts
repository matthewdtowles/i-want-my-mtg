import { Card } from "../card.entity";
import { Legality } from "../legality.entity";

export const CardRepositoryPort = "CardRepositoryPort";

/**
 * Persistence layer for Card entity
 */
export interface CardRepositoryPort {
    /**
     * Create card entities, update if they exist
     *
     * @param cards
     * @returns saved card(s)
     */
    save(cards: Card[]): Promise<Card[]>;

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
     * @param id
     * @returns card entity with id, null if not found
     */
    findById(id: number): Promise<Card | null>;

    /**
     * @param code three letter set code
     * @param number card number in set
     * @returns card entity in set with code and card number in set
     */
    findBySetCodeAndNumber(code: string, number: number): Promise<Card | null>;

    /**
     * @param uuid
     * @returns card entity with uuid, null if not found
     */
    findByUuid(uuid: string): Promise<Card | null>;

    /**
     * Remove card entity
     *
     * @param card
     */
    delete(card: Card): Promise<void>;

}

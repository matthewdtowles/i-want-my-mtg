import { Card } from '../card';

export const CardRepositoryPort = 'CardRepositoryPort';

/**
 * Persistence layer for Card entity
 */
export interface CardRepositoryPort {

    /**
     * @param card 
     * @returns true if card entity exists, false otherwise
     */
    cardExists(card: Card): Promise<boolean>;

    /**
     * @param code three letter set code
     * @returns card entities in set with code
     */
    findAllInSet(code: string): Promise<Card[] | null>;

    /**
     * @param name 
     * @returns card entities with name
     */
    findAllWithName(name: string): Promise<Card[] | null>;

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
     * Remove card entity with id
     * 
     * @param id
     */
    removeById(id: number): Promise<void>;

    /**
     * Create card entity, update if entity exists
     * 
     * @param card
     * @returns created|updated card
     */
    saveCard(card: Card): Promise<Card>;
}
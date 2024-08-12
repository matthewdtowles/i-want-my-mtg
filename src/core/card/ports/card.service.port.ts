import { Card } from '../card';

export const CardServicePort = 'CardServicePort';

/**
 * Individual Card service
 * Implemented by Core
 * Used by Adapters
 */
export interface CardServicePort {

    /**
     * Save card if not created
     * 
     * @param card 
     * @returns saved card
     */
    create(card: Card): Promise<Card>;

    /**
     * @param setCode 
     * @returns all cards in set
     */
    findAllInSet(setCode: string): Promise<Card[]>;

    /**
     * @param name Card.name
     * @returns all cards with name
     */
    findAllWithName(name: string): Promise<Card[]>;
    
    /**
     * @param id
     * @returns card with id | null if not found
     */
    findById(id: number): Promise<Card | null>;

    /**
     * @param setCode 
     * @param number
     * @returns card with number in set
     */
    findBySetCodeAndNumber(setCode: string, number: number): Promise<Card>;

    /**
     * @param uuid
     * @returns card with unique uuid | null if not found
     */
    findByUuid(uuid: string): Promise<Card | null>;

    /**
     * Update card that exists
     *
     * @param card 
     * @returns updated card
     */
    update(card: Card): Promise<Card>;
}
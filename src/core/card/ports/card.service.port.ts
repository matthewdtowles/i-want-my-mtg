import { Card } from '../card.entity';

/**
 * Individual Card service
 * Implemented by Core
 * Used by Adapters
 */
export interface CardServicePort {

    /**
     * Save card if not created
     * Return created card
     * 
     * @param card 
     */
    create(card: Card): Promise<Card>;

    /**
     * Return all cards in set
     * 
     * @param setCode 
     */
    findAllInSet(setCode: string): Promise<Card[]>;

    /**
     * Return all cards with name 
     * 
     * @param name Card.name
     */
    findAllWithName(name: string): Promise<Card[]>;
    
    /**
     * Return card with id
     * 
     * @param id 
     */
    findById(id: string): Promise<Card>;

    /**
     * Return card with number in set
     * 
     * @param setCode 
     * @param number 
     */
    findBySetCodeAndNumber(setCode: string, number: number): Promise<Card>;

    /**
     * Update card that exists
     * Return updated card
     *
     * @param card 
     */
    update(card: Card): Promise<Card>;
}
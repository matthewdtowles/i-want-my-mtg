import { Card } from '../card.entity';

/**
 * Individual Card service
 * Implemented by Core
 * Used by Adapters
 */
export interface CardServicePort {

    /**
     * Save Card if not saved
     * Return true if created, false otherwise
     * 
     * @param card 
     */
    create(card: Card): Promise<boolean>;

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
     * Return Card with id
     * 
     * @param id 
     */
    findById(id: string): Promise<Card>;

    /**
     * Return Card with number in set
     * 
     * @param setCode 
     * @param number 
     */
    findBySetCodeAndNumber(setCode: string, number: number): Promise<Card>;

    /**
     * Update Card that existed
     * Return true if changed, false otherwise
     *
     * @param card 
     */
    update(card: Card): Promise<boolean>;
}
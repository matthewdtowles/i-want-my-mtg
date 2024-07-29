import { Card } from "../card.entity";

/**
 * Individual Card operations service
 * Implemented by Core and used by Adapters
 */
export interface CardServicePort {

    /**
     * Creates an instance of the given Card and saves it if instance does not exist
     * 
     * @param card 
     */
    create(card: Card): Card;

    /**
     * Finds a unique Card based on given universally unique ID given
     * 
     * @param id 
     */
    findById(id: string): Card;

    /**
     * Finds the Card at the specified number for the given set code
     * 
     * @param setCode 
     * @param number 
     */
    findBySetCodeAndNumber(setCode: string, number: number): Card;

    /**
     * Finds and returns all printings of cards with given name 
     * 
     * @param name Card.name
     */
    findAllWithName(name: string): Card[];

    /**
     * Updates an instance of given Card that already exists 
     * @param card 
     */
    update(card: Card): Card;
}
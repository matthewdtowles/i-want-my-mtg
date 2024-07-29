import { Card } from 'src/core/card/card.entity';
import { Collection } from '../collection.entity';

/**
 * Individual Collection service
 * Implemented by Core
 * Used by Adapters
 */
export interface CollectionServicePort {

    /**
     * Save collection if not created
     * Return created collection
     * 
     * @param collection 
     */
    create(collection: Collection): Promise<Collection>;
    
    /**
     * Return collection with id
     * 
     * @param id 
     */
    findById(id: string): Promise<Collection>;

    /**
     * Return collection with number in set
     * 
     * @param user 
     * @param number 
     */
    findByUser(user: string, number: number): Promise<Collection>;

    /**
     * Save card to collection
     * Return updated collection
     * 
     * @param collection
     * @param card
     */
    addCard(collection: Collection, card: Card): Promise<Collection>;

    /**
     * Save Cards to collection
     * Return updated collection
     *
     * @param collection
     * @param cards 
     */
    addCards(collection: Collection, cards: Card[]): Promise<Collection>;

    /**
     * Delete card from collection
     * Return updated Collection
     * 
     * @param collection
     * @param card 
     */
    removeCard(collection: Collection, card: Card): Promise<Collection>;

    /**
     * Delete cards from collection
     * Return updated Collection
     * 
     * @param collection
     * @param cards 
     */    
    removeCards(collection: Collection, cards: Card[]): Promise<Collection>;

    /**
     * Update collection that exists
     * Return updated collection
     *
     * @param collection 
     */
    update(collection: Collection): Promise<Collection>;
}
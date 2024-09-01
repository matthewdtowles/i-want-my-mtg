import { Card } from 'src/core/card/card.entity';
import { Inventory } from '../inventory.entity';

export const InventoryServicePort = 'InventoryServicePort';

/**
 * Individual Inventory service
 * Implemented by Core
 * Used by Adapters
 */
export interface InventoryServicePort {

    /**
     * Save inventory if not created
     * Return created inventory
     * 
     * @param inventory 
     */
    create(inventory: Inventory): Promise<Inventory>;
    
    /**
     * Return inventory with id
     * 
     * @param id 
     */
    findById(id: string): Promise<Inventory>;

    /**
     * Return inventory with number in set
     * 
     * @param user 
     * @param number 
     */
    findByUser(user: string, number: number): Promise<Inventory>;

    /**
     * Save card to inventory
     * Return updated inventory
     * 
     * @param inventory
     * @param card
     */
    addCard(inventory: Inventory, card: Card): Promise<Inventory>;

    /**
     * Save Cards to inventory
     * Return updated inventory
     *
     * @param inventory
     * @param cards 
     */
    addCards(inventory: Inventory, cards: Card[]): Promise<Inventory>;

    /**
     * Delete card from inventory
     * Return updated Inventory
     * 
     * @param inventory
     * @param card 
     */
    removeCard(inventory: Inventory, card: Card): Promise<Inventory>;

    /**
     * Delete cards from inventory
     * Return updated Inventory
     * 
     * @param inventory
     * @param cards 
     */    
    removeCards(inventory: Inventory, cards: Card[]): Promise<Inventory>;

    /**
     * Update inventory that exists
     * Return updated inventory
     *
     * @param inventory 
     */
    update(inventory: Inventory): Promise<Inventory>;
}
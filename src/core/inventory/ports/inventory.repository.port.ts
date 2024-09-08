import { Inventory } from '../inventory.entity';

export const InventoryRepositoryPort = 'InventoryRepositoryPort';

/**
 * Persistence layer for inventory entity
 */
export interface InventoryRepositoryPort {

    /**
     * Create inventory entities, update if they exist
     * 
     * @param inventoryItems
     * @returns saved inventory entities
     */
    save(inventoryItems: Inventory[]): Promise<Inventory[]>;

    /**
     * @param userId
     * @returns user's inventory entities
     */
    findByUser(userId: number): Promise<Inventory[]>;

    /**
     * Delete inventory entity
     * Use when quantity is < 1
     * 
     * @param userId user ID
     * @param cardId card ID
     */
    delete(userId: number, cardId: number): Promise<void> 
}
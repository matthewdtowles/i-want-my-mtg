import { User } from 'src/core/user/user.entity';
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
     * @param user
     * @returns user's inventory, null if not found
     */
    findByUser(user: User): Promise<Inventory[]>;

    /**
     * Delete inventory entity
     * 
     * @param inventoryItems
     */
    delete(inventoryItems: Inventory): Promise<void>;
}
import { User } from 'src/core/user/user.entity';
import { Inventory } from '../inventory.entity';


export const InventoryRepositoryPort = 'InventoryRepositoryPort';

/**
 * Persistence layer for inventory entity
 */
export interface InventoryRepositoryPort {

    /**
     * Create inventory, update if exists
     * 
     * @param inventory
     * @returns created | updated inventory
     */
    save(inventory: Inventory): Promise<Inventory>;

    /**
     * @param id
     * @returns inventory entity with id, null if not found
     */
    findById(id: number): Promise<Inventory | null>;

    /**
     * @param inventory
     * @returns user's inventory, null if not found
     */
    findByUser(user: User): Promise<Inventory | null>;

    /**
     * Remove inventory entity
     * 
     * @param inventory
     */
    delete(inventory: Inventory): Promise<void>;
}
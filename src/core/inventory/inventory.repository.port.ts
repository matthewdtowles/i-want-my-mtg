import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { Inventory } from "./inventory.entity";


export const InventoryRepositoryPort = "InventoryRepositoryPort";

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
     * @param cardId
     * @param isFoil
     * @returns user's single inventory entity matching cardId
     */
    findOne(userId: number, cardId: string, isFoil: boolean): Promise<Inventory | null>;

    /**
     * This is used to find both foil and non-foil cards
     * 
     * @param userId
     * @param cardId
     * @returns user's inventory entities matching cardId
     */
    findByCard(userId: number, cardId: string): Promise<Inventory[]>;

    /**
     * Find user inventory items in given set of card IDs
     *
     * @param userId
     * @param cardIds
     * @returns user's inventory entities matching card IDs
     */
    findByCards(userId: number, cardIds: string[]): Promise<Inventory[]>;

    /**
     * Find user inventory items with pagination
     *
     * @param {number} userId 
     * @param {SafeQueryOptions} options safe pagination and filter options
     * @returns user's inventory entities for given page
     */
    findByUser(userId: number, options: SafeQueryOptions): Promise<Inventory[]>;

    /**
     * Get total number of inventory items for user
     *
     * @param {number} userId
     * @param {SafeQueryOptions} options safe pagination and filter options
     * @returns total number of inventory items
     */
    totalInventoryItemsForUser(userId: number, options: SafeQueryOptions): Promise<number>;

    /**
     * Delete inventory entity
     * Use when quantity is < 1
     *
     * @param userId user ID
     * @param cardId card ID - UUID
     * @param foil true if foil card, false otherwise
     */
    delete(userId: number, cardId: string, foil: boolean): Promise<void>;
}

import { Inventory } from "src/core/inventory/inventory.entity";


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
     * @param userId
     * @param page
     * @param limit
     * @param filter optional filter by card name
     * @returns user's inventory entities for given page
     */
    findByUser(userId: number, page: number, limit: number, filter?: string): Promise<Inventory[]>;

    /**
     * Get total number of inventory items for user
     * 
     * @param userId 
     * @param filter optional filter by card name
     * @returns total number of inventory items
     */
    totalInventoryItemsForUser(userId: number, filter?: string): Promise<number>;

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

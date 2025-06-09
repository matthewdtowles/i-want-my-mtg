import { Inventory } from "src/core/inventory";

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
     * @param userId
     * @returns user's inventory entities
     */
    findByUser(userId: number): Promise<Inventory[]>;

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

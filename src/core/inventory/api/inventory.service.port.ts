import { InventoryCardDto, InventoryDto } from "../api/inventory.dto";

export const InventoryServicePort = "InventoryServicePort";

/**
 * Individual Inventory service
 * Implemented by Core
 * Used by Adapters
 */
export interface InventoryServicePort {

    /**
     * Create inventory items
     *
     * @param inventoryItems
     * @returns created inventory items
     */
    create(inventoryItems: InventoryDto[]): Promise<InventoryDto[]>;

    /**
     * Update inventory items
     *
     * @param inventoryItems
     * @returns updated inventory items
     */
    update(inventoryItems: InventoryDto[]): Promise<InventoryDto[]>;

    /**
     * Returns user's inventory items matching given cardId
     * This is used to find both foil and non-foil cards
     *
     * @param userId
     * @param cardId
     * @returns user's inventory items for card with cardId
     */
    findForUser(userId: number, cardId: number): Promise<InventoryDto[]>;

    /**
     * Return user's inventory with cards
     * 
     * @param userId
     * @returns user's inventory with cards
     */
    findAllCardsForUser(userId: number): Promise<InventoryCardDto[]>;

    /**
     * Delete user's inventory item
     *
     * @param userId
     * @param cardId
     * @param isFoil true if foil card, false otherwise
     * @returns true if item was deleted
     */
    delete(userId: number, cardId: number, isFoil: boolean): Promise<boolean>;
}
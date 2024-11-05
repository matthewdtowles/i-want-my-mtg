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
     * Returns user's inventory item matching given cardId
     *
     * @param userId
     * @param cardId
     * @returns user's inventory item for card with cardId
     */
    findOneForUser(userId: number, cardId: number): Promise<InventoryDto| null>;

    /**
     * Returns user's inventory item with card matching cardId
     *
     * @param userId
     * @param cardId
     * @returns user's inventory item with card matching cardId
     */
    findOneCardForUser(userId: number, cardId: number): Promise<InventoryCardDto | null>;

    /**
     * Return user's inventory items
     *
     * @param userId
     * @returns user's inventory items
     */
    findAllForUser(userId: number): Promise<InventoryDto[]>;

    /**
     * Return user's inventory with cards
     * 
     * @param userId
     * @returns user's inventory with cards
     */
    findAllCardsForUser(userId: number): Promise<InventoryCardDto[]>;
}
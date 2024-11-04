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
     * Return user's inventory items
     *
     * @param userId
     * @returns user's inventory items
     */
    findByUser(userId: number): Promise<InventoryDto[]>;

    /**
     * Return user's inventory with cards
     * 
     * @param userId
     * @returns user's inventory with cards
     */
    findCardsByUser(userId: number): Promise<InventoryCardDto[]>;
}
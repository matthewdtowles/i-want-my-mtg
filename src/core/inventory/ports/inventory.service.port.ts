import { CreateInventoryDto } from "../dto/create-inventory.dto";
import { InventoryDto } from "../dto/inventory.dto";
import { UpdateInventoryDto } from "../dto/update-inventory.dto";

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
    create(inventoryItems: CreateInventoryDto[]): Promise<InventoryDto[]>;

    /**
     * Update inventory items
     *
     * @param inventoryItems
     * @returns updated inventory items
     */
    update(inventoryItems: UpdateInventoryDto[]): Promise<InventoryDto[]>;

    /**
     * Return user's inventory items
     *
     * @param userId
     * @returns user's inventory items
     */
    findByUser(userId: number): Promise<InventoryDto[]>;
}

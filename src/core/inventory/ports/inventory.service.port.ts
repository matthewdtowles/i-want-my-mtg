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
   * Save inventory items
   *
   * @param inventoryItems
   * @returns saved inventory items
   */
  save(
    inventoryItems: CreateInventoryDto[] | UpdateInventoryDto[],
  ): Promise<InventoryDto[]>;

  /**
   * Return user's inventory items
   *
   * @param userId
   * @returns user's inventory items
   */
  findByUser(userId: number): Promise<InventoryDto[]>;

  /**
   * Delete inventory item(s)
   *
   * @param inventoryItems
   */
  remove(inventoryItems: UpdateInventoryDto[]): Promise<void>;
}

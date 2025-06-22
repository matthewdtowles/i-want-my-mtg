import { InventoryQuantities } from "src/adapters/http/inventory/inventory.quantities";
import { InventoryRequestDto } from "src/adapters/http/inventory/inventory.request.dto";
import { Inventory } from "src/core/inventory/inventory.entity";


export class InventoryPresenter {

    /**
     * @param inventoryItems
     * @param userId 
     * @returns a list of Inventory entities based on the provided DTOs and userId.
     * This is used for creating or updating inventory items in the database.
     */
    static toEntities(inventoryItems: InventoryRequestDto[], userId: number): Inventory[] {
        return inventoryItems.map((item: InventoryRequestDto) => this.toEntity(item, userId));
    }

    /**
     * Converts a single InventoryRequestDto to an Inventory entity.
     *
     * @param dto - The InventoryRequestDto to convert.
     * @param userId - The ID of the user who owns the inventory item.
     * @returns An Inventory entity.
     * This is used for creating or updating a single inventory item in the database.
     */
    static toEntity(dto: InventoryRequestDto, userId: number): Inventory {
        return new Inventory({
            cardId: dto.cardId,
            isFoil: dto.isFoil ?? false,
            quantity: dto.quantity ?? 0,
            userId: userId,
        });
    }

    /**
     * @param inventory
     * @returns map of cardId to foil and normal quantities owned by the user.
     */
    static toQuantityMap(inventory: Inventory[]): Map<string, InventoryQuantities> {
        const quantityMap: Map<string, InventoryQuantities> = new Map<string, InventoryQuantities>();
        for (const item of inventory) {
            const key: string = item.cardId;
            const existing: InventoryQuantities = quantityMap.get(key) || new InventoryQuantities(0, 0);
            if (item.isFoil) {
                existing.foilQuantity += item.quantity;
            } else {
                existing.normalQuantity += item.quantity;
            }
            quantityMap.set(key, existing);
        }
        return quantityMap;
    }
}

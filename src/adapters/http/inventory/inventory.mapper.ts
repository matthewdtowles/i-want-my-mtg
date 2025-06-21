import { InventoryQuantities } from "src/adapters/http/inventory/inventory.quantities";
import { InventoryRequestDto } from "src/adapters/http/inventory/inventory.request.dto";
import { InventoryCardResponseDto } from "src/adapters/http/inventory/inventory.response.dto";
import { Inventory } from "src/core/inventory/inventory.entity";


export class InventoryMapper {

    static toEntities(inventoryItems: InventoryRequestDto[], userId: number): Inventory[] {
        return inventoryItems.map((item: InventoryRequestDto) => this.toEntity(item, userId));
    }

    static toEntity(dto: InventoryRequestDto, userId: number): Inventory {
        return new Inventory({
            cardId: dto.cardId,
            isFoil: dto.isFoil ?? false,
            quantity: dto.quantity ?? 0,
            userId: userId,
        });
    }

    /**
     * Returns a 
     *
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

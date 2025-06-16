import { InventoryDto } from "src/adapters/http/inventory/inventory.dto";
import { Inventory } from "src/core/inventory/inventory.entity";


export class InventoryMapper {

    static toEntities(inventoryItems: InventoryDto[]): Inventory[] {
        return inventoryItems.map((item: InventoryDto) => this.toEntity(item));
    }

    static toEntity(dto: InventoryDto): Inventory {
        return new Inventory({
            cardId: dto.cardId,
            isFoil: dto.isFoil ?? false,
            quantity: dto.quantity ?? 0,
            userId: dto.userId,
        });
    }
}

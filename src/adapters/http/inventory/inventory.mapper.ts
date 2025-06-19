import { InventoryRequestDto } from "src/adapters/http/inventory/inventory.request.dto";
import { Inventory } from "src/core/inventory/inventory.entity";


export class InventoryMapper {

    static toEntities(inventoryItems: InventoryRequestDto[]): Inventory[] {
        return inventoryItems.map((item: InventoryRequestDto) => this.toEntity(item));
    }

    static toEntity(dto: InventoryRequestDto): Inventory {
        return new Inventory({
            cardId: dto.cardId,
            isFoil: dto.isFoil ?? false,
            quantity: dto.quantity ?? 0,
            userId: dto.userId,
        });
    }

}

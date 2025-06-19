import { Logger } from "@nestjs/common";
import { InventoryRequestDto } from "src/adapters/http/inventory/inventory.request.dto";
import { Inventory } from "src/core/inventory/inventory.entity";


export class InventoryMapper {

    private static readonly LOGGER = new Logger(InventoryMapper.name);

    static toEntities(inventoryItems: InventoryRequestDto[], userId: number): Inventory[] {
        return inventoryItems.map((item: InventoryRequestDto) => this.toEntity(item, userId));
    }

    static toEntity(dto: InventoryRequestDto, userId: number): Inventory {
        this.LOGGER.debug(`Mapping InventoryRequestDto to Inventory entity for userId: ${userId}`);
        return new Inventory({
            cardId: dto.cardId,
            isFoil: dto.isFoil ?? false,
            quantity: dto.quantity ?? 0,
            userId: userId,
        });
    }

}

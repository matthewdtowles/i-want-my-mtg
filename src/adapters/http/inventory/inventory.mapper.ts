import { Injectable } from "@nestjs/common";
import { CardMapper } from "src/adapters/http/card/card.mapper";
import { InventoryDto } from "src/adapters/http/inventory/inventory.dto";
import { Card, CardImgType } from "src/core/card";
import { Inventory } from "src/core/inventory";


@Injectable()
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

    static toDtos(entities: Inventory[]): InventoryDto[] {
        return entities.map((entity: Inventory) => this.toDto(entity));
    }

    static toDto(inventoryEntity: Inventory): InventoryDto {
        const cardEntity: Card | null = inventoryEntity.card || null;
        const inventory: InventoryDto = {
            card: cardEntity ? CardMapper.entityToDto(inventoryEntity.card, CardImgType.SMALL) : null,
            cardId: inventoryEntity.cardId,
            isFoil: inventoryEntity.isFoil,
            quantity: inventoryEntity.quantity,
            userId: inventoryEntity.userId,
        };
        return inventory;
    }
}

import { Inject, Injectable } from "@nestjs/common";
import { Card, CardImgType, CardMapper } from "src/core/card";
import { Inventory, InventoryDto } from "src/core/inventory";
import { User } from "src/core/user";

@Injectable()
export class InventoryMapper {

    constructor(@Inject(CardMapper) private readonly cardMapper: CardMapper) { }

    toEntities(inventoryItems: InventoryDto[]): Inventory[] {
        return inventoryItems.map((item: InventoryDto) => this.toEntity(item));
    }

    toEntity(dto: InventoryDto): Inventory {
        const inventoryEntity: Inventory = new Inventory();
        inventoryEntity.quantity = dto.quantity ?? 0;
        inventoryEntity.cardId = dto.cardId;
        inventoryEntity.isFoil = dto.isFoil ?? false;
        inventoryEntity.user = new User();
        inventoryEntity.user.id = dto.userId;
        inventoryEntity.userId = dto.userId;
        return inventoryEntity;
    }

    toDtos(entities: Inventory[]): InventoryDto[] {
        return entities.map((entity: Inventory) => this.toDto(entity));
    }

    toDto(inventoryEntity: Inventory): InventoryDto {
        const cardEntity: Card | null = inventoryEntity.card || null;
        const inventory: InventoryDto = {
            card: cardEntity ? this.cardMapper.entityToDto(inventoryEntity.card, CardImgType.SMALL) : null,
            cardId: inventoryEntity.cardId,
            isFoil: inventoryEntity.isFoil,
            quantity: inventoryEntity.quantity,
            userId: inventoryEntity.userId,
        };
        return inventory;
    }
}

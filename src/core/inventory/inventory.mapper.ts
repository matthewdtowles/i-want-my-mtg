import { Inject, Injectable } from "@nestjs/common";
import { CardImgType } from "src/core/card/api/card.img.type.enum";
import { Card } from "src/core/card/card.entity";
import { CardMapper } from "src/core/card/card.mapper";
import { Inventory } from "src/core/inventory/inventory.entity";
import { User } from "src/core/user/user.entity";
import { InventoryDto } from "./api/inventory.dto";

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

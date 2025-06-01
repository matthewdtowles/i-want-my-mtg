import { Inject, Injectable } from "@nestjs/common";
import { CardDto } from "src/core/card/api/card.dto";
import { CardImgType } from "src/core/card/api/card.img.type.enum";
import { CardMapper } from "src/core/card/card.mapper";
import { Inventory } from "src/core/inventory/inventory.entity";
import { User } from "src/core/user/user.entity";
import { InventoryDto } from "./api/inventory.dto";

@Injectable()
export class InventoryMapper {

    constructor(@Inject(CardMapper) private readonly cardMapper: CardMapper) { }

    toEntities(inventoryItems: InventoryDto[]): Inventory[] {
        return inventoryItems.map((item: InventoryDto | InventoryDto) => this.toEntity(item));
    }

    toEntity(dto: InventoryDto): Inventory | null {
        if (!dto) {
            return null;
        }
        const inventoryEntity: Inventory = new Inventory();
        inventoryEntity.quantity = dto.quantity ?? 0;
        inventoryEntity.cardId = dto.cardId;
        inventoryEntity.isFoil = dto.isFoil ?? false;
        inventoryEntity.user = new User();
        inventoryEntity.user.id = dto.userId;
        inventoryEntity.userId = dto.userId;
        return inventoryEntity;
    }

    toDtos(inventoryItems: Inventory[]): InventoryDto[] {
        return inventoryItems.map((item: Inventory) => this.toDto(item));
    }

    toDto(inventoryEntity: Inventory): InventoryDto | null {
        if (!inventoryEntity) {
            return null;
        }
        const inventory: InventoryDto = {
            cardId: inventoryEntity.cardId,
            isFoil: inventoryEntity.isFoil,
            quantity: inventoryEntity.quantity,
            userId: inventoryEntity.userId,
        };
        return inventory;
    }

    toInventoryCardDtos(inventoryEntities: Inventory[]): InventoryDto[] {
        return inventoryEntities.map((item: Inventory) => this.toInventoryCardDto(item));
    }

    toInventoryCardDto(inventoryEntity: Inventory): InventoryDto | null {
        if (!inventoryEntity) {
            return null;
        }
        const cardDto: CardDto = this.cardMapper.entityToDto(inventoryEntity.card, CardImgType.SMALL);
        const inventory: InventoryDto = {
            cardId: inventoryEntity.cardId,
            card: cardDto,
            isFoil: inventoryEntity.isFoil,
            quantity: inventoryEntity.quantity,
            userId: inventoryEntity.user && inventoryEntity.user.id ? inventoryEntity.user.id : inventoryEntity.userId,
        };
        return inventory;
    }
}

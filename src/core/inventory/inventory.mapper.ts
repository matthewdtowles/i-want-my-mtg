import { Inject, Injectable } from "@nestjs/common";
import { CardImgType } from "src/core/card/api/card.img.type.enum";
import { Inventory } from "src/core/inventory/inventory.entity";
import { CardMapper } from "../card/card.mapper";
import { User } from "../user/user.entity";
import { InventoryCardDto, InventoryDto } from "./api/inventory.dto";

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

    toInventoryCardDtos(inventoryEntities: Inventory[]): InventoryCardDto[] {
        return inventoryEntities.map((item: Inventory) => this.toInventoryCardDto(item));
    }

    toInventoryCardDto(inventoryEntity: Inventory): InventoryCardDto | null {
        if (!inventoryEntity) {
            return null;
        }
        const inventory: InventoryCardDto = {
            card: this.cardMapper.entityToDto(inventoryEntity.card, CardImgType.SMALL),
            isFoil: inventoryEntity.isFoil,
            quantity: inventoryEntity.quantity,
            userId: inventoryEntity.user && inventoryEntity.user.id
                ? inventoryEntity.user.id : inventoryEntity.userId,
        };
        return inventory;
    }
}

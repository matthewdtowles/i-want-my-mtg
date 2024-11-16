import { Inject, Injectable, Logger } from "@nestjs/common";
import { Inventory } from "src/core/inventory/inventory.entity";
import { CardMapper } from "../card/card.mapper";
import { User } from "../user/user.entity";
import { InventoryCardDto, InventoryDto } from "./api/inventory.dto";

@Injectable()
export class InventoryMapper {
    private readonly LOGGER: Logger = new Logger(InventoryMapper.name);

    constructor(@Inject(CardMapper) private readonly cardMapper: CardMapper) { }

    toEntities(inventoryItems: InventoryDto[]): Inventory[] {
        return inventoryItems.map((item: InventoryDto | InventoryDto) => this.toEntity(item));
    }

    toEntity(dto: InventoryDto): Inventory | null {
        if (!dto) {
            this.LOGGER.error("toEntity called with null dto");
            return null;
        }
        const inventoryEntity: Inventory = new Inventory();
        inventoryEntity.quantity = dto.quantity ?? 0;
        inventoryEntity.cardId = dto.cardId;
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
            this.LOGGER.error("toDto called with null entity");
            return null;
        }
        const inventory: InventoryDto = {
            cardId: inventoryEntity.cardId,
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
            this.LOGGER.error("toDto called with null entity");
            return null;
        }
        const inventory: InventoryCardDto = {
            card: this.cardMapper.entityToDto(inventoryEntity.card),
            quantity: inventoryEntity.quantity,
            userId: inventoryEntity.user && inventoryEntity.user.id
                ? inventoryEntity.user.id : inventoryEntity.userId,
        };
        return inventory;
    }
}

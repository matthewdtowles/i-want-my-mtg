import { Inject, Injectable, Logger } from "@nestjs/common";
import { Inventory } from "src/core/inventory/inventory.entity";
import { CardMapper } from "../card/card.mapper";
import { User } from "../user/user.entity";
import { InventoryCardDto, InventoryDto } from "./api/inventory.dto";

@Injectable()
export class InventoryMapper {

    private readonly LOGGER: Logger = new Logger(InventoryMapper.name);

    constructor(@Inject(CardMapper) private readonly cardMapper: CardMapper) { }

    toEntities(inventoryItems: InventoryDto[] | InventoryDto[]): Inventory[] {
        this.LOGGER.debug(`toEntities ${JSON.stringify(inventoryItems)}`);
        return inventoryItems.map((item: InventoryDto | InventoryDto) => this.toEntity(item));
    }

    toEntity(dto: InventoryDto): Inventory | null {
        this.LOGGER.debug(`toEntity called`);
        if (!dto) {
            this.LOGGER.error("toEntity called with null dto");
            return null;
        }
        this.LOGGER.debug(`toEntity called with dto: ${JSON.stringify(dto)}`);
        const inventoryEntity = new Inventory();
        inventoryEntity.quantity = dto.quantity ?? 0;
        inventoryEntity.cardId = dto.cardId;
        inventoryEntity.user = new User();
        inventoryEntity.user.id = dto.userId;
        this.LOGGER.debug(`toEntity returning entity: ${JSON.stringify(inventoryEntity)}`);
        return inventoryEntity;
    }

    toDtos(inventoryItems: Inventory[]): InventoryDto[] {
        this.LOGGER.debug(`toDtos ${JSON.stringify(inventoryItems)}`);
        return inventoryItems.map((item: Inventory) => this.toDto(item));
    }

    toDto(inventoryEntity: Inventory): InventoryDto | null {
        if (!inventoryEntity) {
            this.LOGGER.error("toDto called with null entity");
            return null;
        }
        this.LOGGER.debug(`toDto called with entity: ${JSON.stringify(inventoryEntity)}`);
        const inventory: InventoryDto = {
            cardId: inventoryEntity.cardId,
            quantity: inventoryEntity.quantity,
            userId: inventoryEntity.user.id
        };
        this.LOGGER.debug(`toDto returning dto: ${JSON.stringify(inventory)}`);
        return inventory;
    }

    toInventoryCardDtos(inventoryEntities: Inventory[]): InventoryCardDto[] {
        this.LOGGER.debug(`toInventoryCardDtos ${JSON.stringify(inventoryEntities)}`);
        return inventoryEntities.map((item: Inventory) => this.toInventoryCardDto(item));
    }

    toInventoryCardDto(inventoryEntity: Inventory): InventoryCardDto | null {
        if (!inventoryEntity) {
            this.LOGGER.error("toDto called with null entity");
            return null;
        }
        this.LOGGER.debug(`toDto called with entity: ${JSON.stringify(inventoryEntity)}`);
        const inventory: InventoryCardDto = {
            card: this.cardMapper.entityToDto(inventoryEntity.card),
            quantity: inventoryEntity.quantity,
            userId: inventoryEntity.user.id
        };
        this.LOGGER.debug(`toDto returning dto: ${JSON.stringify(inventory)}`);
        return inventory;
    }
}

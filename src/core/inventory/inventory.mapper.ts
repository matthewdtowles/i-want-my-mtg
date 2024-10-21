import { Inject, Injectable } from "@nestjs/common";
import { Inventory } from "src/core/inventory/inventory.entity";
import { CardMapper } from "../card/card.mapper";
import { User } from "../user/user.entity";
import { CreateInventoryDto } from "./dto/create-inventory.dto";
import { InventoryDto } from "./dto/inventory.dto";
import { UpdateInventoryDto } from "./dto/update-inventory.dto";
import { UserMapper } from "../user/user.mapper";

@Injectable()
export class InventoryMapper {
  // TODO: do we need to inject CardMapper here? or UserMapper?
  constructor(
    @Inject(CardMapper) private readonly cardMapper: CardMapper,
    @Inject(UserMapper) private readonly userMapper: UserMapper,
  ) {}

  toEntities(
    inventoryItems: CreateInventoryDto[] | UpdateInventoryDto[],
  ): Inventory[] {
    const entities: Inventory[] = [];
    if (inventoryItems) {
      inventoryItems.forEach((item) => {
        entities.push(this.toEntity(item));
      });
    }
    return entities;
  }

  toEntity(
    dto: CreateInventoryDto | UpdateInventoryDto,
  ): Inventory | undefined {
    const inventoryEntity = new Inventory();
    inventoryEntity.quantity = dto.quantity ? dto.quantity : 1;
    (inventoryEntity.cardId = dto.cardId), (inventoryEntity.user = new User());
    inventoryEntity.user.id = dto.userId;
    return inventoryEntity;
  }

  toDtos(inventoryItems: Inventory[]): InventoryDto[] {
    const dtos: InventoryDto[] = [];
    if (inventoryItems) {
      inventoryItems.forEach((item) => {
        dtos.push(this.toDto(item));
      });
    }
    return dtos;
  }

  toDto(inventoryEntity: Inventory): InventoryDto | undefined {
    if (!inventoryEntity) {
      return undefined;
    }
    const inventory: InventoryDto = {
      card: this.cardMapper.entityToDto(inventoryEntity.card),
      quantity: inventoryEntity.quantity,
      user: this.userMapper.entityToDto(inventoryEntity.user),
    };
    return inventory;
  }
}

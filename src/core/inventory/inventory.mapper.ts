import { Injectable } from '@nestjs/common';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { CardMapper } from '../card/card.mapper';
import { User } from '../user/user.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { InventoryDto } from './dto/inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryMapper {

    toEntities(inventoryItems: CreateInventoryDto[] | UpdateInventoryDto[]): Inventory[] {
        const entities: Inventory[] = [];
        if (inventoryItems) {
            inventoryItems.forEach(item => {
                entities.push(this.toEntity(item));
            });
        }
        return entities;
    }

    toEntity(dto: CreateInventoryDto | UpdateInventoryDto): Inventory | undefined {
        if (!dto) {
            return undefined;
        }
        const inventoryEntity = new Inventory();
        inventoryEntity.quantity = dto.quantity;
        inventoryEntity.card = CardMapper.readDtoToEntity(dto.card);
        inventoryEntity.user = new User();
        inventoryEntity.user.id = dto.userId;
        return inventoryEntity;
    }

    toDtos(inventoryItems: Inventory[]): InventoryDto[] {
        const dtos: InventoryDto[] = [];
        if (inventoryItems) {
            inventoryItems.forEach(item => {
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
            id: inventoryEntity.id,
            card: CardMapper.entityToDto(inventoryEntity.card),
            quantity: inventoryEntity.quantity,
            userId: inventoryEntity.userId
        };
        return inventory
    }
}
import { Injectable } from '@nestjs/common';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryDto } from './dto/inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { User } from '../user/user.entity';

@Injectable()
export class InventoryMapper {

    // TODO: impl


    entityToDto(inventory: Inventory): InventoryDto {
        const inventoryDto = new InventoryDto();

        return inventoryDto;
    }

    updateDtoToEntity(updateInventoryDto: UpdateInventoryDto): Inventory {
        const inventory = new Inventory();

        return inventory;
    }

    toEntity(inventory: Inventory): Inventory {
        if (null === inventory || undefined === inventory) {
            return null;
        }
        const inventoryEntity = new Inventory();
        inventoryEntity.id = inventory.id;
        inventoryEntity.card = inventory.card;
        inventoryEntity.user = new User();
        inventoryEntity.user.id = inventory.user.id;
        inventoryEntity.user.email = inventory.user.email;
        inventoryEntity.user.name = inventory.user.name;
        return inventoryEntity;
    }

    toDto(inventoryEntity: Inventory): Inventory {
        if (null === inventoryEntity || undefined === inventoryEntity) {
            return null;
        }
        const inventory = new Inventory();
        inventory.card = inventoryEntity.card;
        inventory.id = inventoryEntity.id;
        inventory.user = inventoryEntity.user;
        return inventory
    }
}
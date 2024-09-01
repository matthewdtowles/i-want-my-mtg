import { Injectable } from '@nestjs/common';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { InventoryDto } from './dto/inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryMapper {

    // TODO: impl

    dtoToEntity(createInventoryDto: CreateInventoryDto): Inventory {
        const inventory = new Inventory();

        return inventory;
    }

    entityToDto(inventory: Inventory): InventoryDto {
        const inventoryDto = new InventoryDto();

        return inventoryDto;
    }

    updateDtoToEntity(updateInventoryDto: UpdateInventoryDto): Inventory {
        const inventory = new Inventory();

        return inventory;
    }

    private mapManaToView(manaCost: string): string[] {
        return manaCost ? manaCost
            .toLowerCase()
            .trim()
            .replaceAll('/', '')
            .replace('{', '')
            .replaceAll('}', '')
            .split('{') : null;
    }

    private mapManaToRepo(manaCost: string[]): string {
        return null;
    }
}
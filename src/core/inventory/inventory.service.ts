import { Inject, Injectable } from '@nestjs/common';
import { UserDto } from '../user/dto/user.dto';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { InventoryDto } from './dto/inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { InventoryRepositoryPort } from './ports/inventory.repository.port';
import { InventoryServicePort } from './ports/inventory.service.port';
import { InventoryMapper } from './inventory.mapper';
import { Inventory } from './inventory.entity';

@Injectable()
export class InventoryService implements InventoryServicePort {

    constructor(
        @Inject(InventoryRepositoryPort) private readonly repository: InventoryRepositoryPort,
        @Inject(InventoryMapper) private readonly mapper: InventoryMapper,
    ) { }

    // TODO: implement
    async save(inventoryItems: CreateInventoryDto[] | UpdateInventoryDto[]): Promise<InventoryDto[]> {
        const savedItems: Inventory[] = await this.repository.save(this.mapper.toEntities(inventoryItems))
        return this.mapper.toDtos(savedItems);
    }

    async findByUser(user: UserDto): Promise<InventoryDto[]> {
        throw new Error('Method not implemented.');
    }

    async remove(inventoryItems: UpdateInventoryDto[]): Promise<void> {
        throw new Error('Method not implemented.');
    }
}

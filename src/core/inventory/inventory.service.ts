import { Inject, Injectable } from '@nestjs/common';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { InventoryDto } from './dto/inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Inventory } from './inventory.entity';
import { InventoryMapper } from './inventory.mapper';
import { InventoryRepositoryPort } from './ports/inventory.repository.port';
import { InventoryServicePort } from './ports/inventory.service.port';

@Injectable()
export class InventoryService implements InventoryServicePort {

    constructor(
        @Inject(InventoryRepositoryPort) private readonly repository: InventoryRepositoryPort,
        @Inject(InventoryMapper) private readonly mapper: InventoryMapper,
    ) { }

    async save(inventoryItems: CreateInventoryDto[] | UpdateInventoryDto[]): Promise<InventoryDto[]> {
        const entities: Inventory[] = this.mapper.toEntities(inventoryItems);
        const savedItems: Inventory[] = await this.repository.save(entities);
        return this.mapper.toDtos(savedItems);
    }

    async findByUser(userId: number): Promise<InventoryDto[]> {
        const foundItems: Inventory[] = await this.repository.findByUser(userId);
        return this.mapper.toDtos(foundItems);
    }

    async remove(inventoryItems: InventoryDto[]): Promise<void> {
        inventoryItems.forEach(async item => {
            const entity: Inventory = this.mapper.toEntity(item);
            await this.repository.delete(entity);
        });
    }
}

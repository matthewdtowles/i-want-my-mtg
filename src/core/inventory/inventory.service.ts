import { Inject, Injectable, Logger } from "@nestjs/common";
import { InventoryCardDto, InventoryDto } from "./api/inventory.dto";
import { Inventory } from "./inventory.entity";
import { InventoryMapper } from "./inventory.mapper";
import { InventoryRepositoryPort } from "./api/inventory.repository.port";
import { InventoryServicePort } from "./api/inventory.service.port";

@Injectable()
export class InventoryService implements InventoryServicePort {

    private readonly LOGGER: Logger = new Logger(InventoryService.name);

    constructor(
        @Inject(InventoryRepositoryPort) private readonly repository: InventoryRepositoryPort,
        @Inject(InventoryMapper) private readonly mapper: InventoryMapper,
    ) { }

    async create(inventoryItems: InventoryDto[]): Promise<InventoryDto[]> {
        const entities: Inventory[] = this.mapper.toEntities(inventoryItems);
        const savedItems: Inventory[] = await this.repository.save(entities);
        return this.mapper.toDtos(savedItems);
    }

    async update(inventoryItems: InventoryDto[]): Promise<InventoryDto[]> {
        const cleanItems: InventoryDto[] = await this.cleanUpForSave(inventoryItems);
        const entities: Inventory[] = this.mapper.toEntities(cleanItems);
        const savedItems: Inventory[] = await this.repository.save(entities);
        return this.mapper.toDtos(savedItems);
    }

    async findByUser(userId: number): Promise<InventoryDto[]> {
        const foundItems: Inventory[] = await this.repository.findByUser(userId);
        this.LOGGER.debug(`Found ${JSON.stringify(foundItems)} inventory items for user ${userId}`);
        return this.mapper.toDtos(foundItems);
    }

    async findCardsByUser(userId: number): Promise<InventoryCardDto[]> {
        const foundCards: Inventory[] = await this.repository.findByUser(userId);
        this.LOGGER.debug(`Found ${JSON.stringify(foundCards)} inventory items for user ${userId}`);
        return this.mapper.toInventoryCardDtos(foundCards);
    }

    private async cleanUpForSave(inventoryItems: InventoryDto[]): Promise<InventoryDto[]> {
        const itemsToDelete: InventoryDto[] = [];
        const itemsToSave: InventoryDto[] = [];
        inventoryItems.forEach(item => {
            if (item.quantity > 0) {
                itemsToSave.push(item);
            } else {
                itemsToDelete.push(item);
            }
        });
        if (itemsToDelete.length > 0) {
            await Promise.all(itemsToDelete.map(item => this.repository.delete(item.userId, item.cardId)));
        }
        return itemsToSave
    }
}

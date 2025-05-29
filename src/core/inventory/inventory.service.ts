import { Inject, Injectable, Logger } from "@nestjs/common";
import { InventoryCardDto, InventoryDto } from "./api/inventory.dto";
import { InventoryRepositoryPort } from "./api/inventory.repository.port";
import { InventoryServicePort } from "./api/inventory.service.port";
import { Inventory } from "./inventory.entity";
import { InventoryMapper } from "./inventory.mapper";

@Injectable()
export class InventoryService implements InventoryServicePort {

    private readonly LOGGER: Logger = new Logger(InventoryService.name);

    constructor(
        @Inject(InventoryRepositoryPort) private readonly repository: InventoryRepositoryPort,
        @Inject(InventoryMapper) private readonly mapper: InventoryMapper,
    ) { }

    async create(inventoryItems: InventoryDto[]): Promise<InventoryDto[]> {
        this.LOGGER.debug(`create ${inventoryItems.length} inventory items`);
        const entities: Inventory[] = this.mapper.toEntities(inventoryItems);
        const savedItems: Inventory[] = await this.repository.save(entities);
        return this.mapper.toDtos(savedItems);
    }

    async update(inventoryItems: InventoryDto[]): Promise<InventoryDto[]> {
        this.LOGGER.debug(`update ${inventoryItems.length} inventory items`);
        const entities: Inventory[] = this.mapper.toEntities(inventoryItems);
        const savedItems: Inventory[] = await this.repository.save(entities);
        return this.mapper.toDtos(savedItems);
    }

    async findForUser(userId: number, cardId: number): Promise<InventoryDto[]> {
        this.LOGGER.debug(`findOneForUser ${userId}, card: ${cardId}`);
        if (!userId || !cardId) {
            return [];
        }
        const foundItems: Inventory[] = await this.repository.findByCard(userId, cardId);
        return this.mapper.toDtos(foundItems);
    }

    async findAllCardsForUser(userId: number): Promise<InventoryCardDto[]> {
        this.LOGGER.debug(`findAllCardsForUser ${userId}`);
        if (!userId) {
            return [];
        }
        const foundCards: Inventory[] = await this.repository.findByUser(userId);
        return this.mapper.toInventoryCardDtos(foundCards);
    }

    async delete(userId: number, cardId: number, isFoil: boolean): Promise<boolean> {
        this.LOGGER.debug(`delete inventory entry for user: ${userId}, card: ${cardId}, foil: ${isFoil}`);
        let result = false;
        if (userId && cardId) {
            try {
                await this.repository.delete(userId, cardId, isFoil);
                const foundItem = await this.repository.findOne(userId, cardId, isFoil);
                if (!foundItem) {
                    result = true;
                }
            }
            catch (error) {
                this.LOGGER.error(`Failed to delete inventory: ${error.message}`);
            }
        }
        return result;
    }
}
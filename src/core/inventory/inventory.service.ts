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

    async findOneForUser(userId: number, cardId: number): Promise<InventoryDto | null> {
        this.LOGGER.debug(`findOneForUser ${userId} ${cardId}`);
        const foundItem: Inventory = await this.repository.findOne(userId, cardId);
        return this.mapper.toDto(foundItem);
    }

    async findOneCardForUser(userId: number, cardId: number): Promise<InventoryCardDto | null> {
        this.LOGGER.debug(`findOneCardForUser ${userId} ${cardId}`);
        const foundItem: Inventory = await this.repository.findOne(userId, cardId);
        return this.mapper.toInventoryCardDto(foundItem);
    }

    async findAllForUser(userId: number): Promise<InventoryDto[]> {
        this.LOGGER.debug(`findAllForUser ${userId}`);
        const foundItems: Inventory[] = await this.repository.findByUser(userId);
        return this.mapper.toDtos(foundItems);
    }

    async findAllCardsForUser(userId: number): Promise<InventoryCardDto[]> {
        this.LOGGER.debug(`findAllCardsForUser ${userId}`);
        const foundCards: Inventory[] = await this.repository.findByUser(userId);
        return this.mapper.toInventoryCardDtos(foundCards);
    }
}

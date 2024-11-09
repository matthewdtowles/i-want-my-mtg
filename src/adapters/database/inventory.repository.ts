import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InventoryRepositoryPort } from "src/core/inventory/api/inventory.repository.port";
import { Inventory } from "src/core/inventory/inventory.entity";
import { Repository } from "typeorm";

@Injectable()
export class InventoryRepository implements InventoryRepositoryPort {

    private readonly LOGGER: Logger = new Logger(InventoryRepository.name);

    constructor(
        @InjectRepository(Inventory) private readonly inventoryRepository: Repository<Inventory>
    ) { }

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        this.LOGGER.debug(`save ${inventoryItems.length} inventory items`);
        return await this.inventoryRepository.save(inventoryItems);
    }

    async findOne(_userId: number, _cardId: number): Promise<Inventory | null> {
        this.LOGGER.debug(`findOne userId: ${_userId}, cardId: ${_cardId}`);
        return await this.inventoryRepository.findOne({
            where: {
                userId: _userId,
                cardId: _cardId,
            },
            // TODO: needed? Should this be split out?
            relations: ["card", "user"],
        });
    }

    async findByUser(_userId: number): Promise<Inventory[]> {
        this.LOGGER.debug(`findByUser userId: ${_userId}`);
        return await this.inventoryRepository.find({
            where: {
                userId: _userId,
            },
            // TODO: needed? Should this be split out?
            relations: ["card", "user"],
        });
    }

    async delete(userId: number, cardId: number): Promise<void> {
        this.LOGGER.debug(`delete userId: ${userId}, cardId: ${cardId}`);
        // TODO: is this necessary to check if the connection is initialized?
        const connection = this.inventoryRepository.manager.connection;
        if (!connection.isInitialized) {
            await connection.initialize(); // Reconnect if the connection is closed
        }
        try {
            await this.inventoryRepository
                .createQueryBuilder()
                .delete()
                .from(Inventory)
                .where("userId = :userId", { userId })
                .andWhere("cardId = :cardId", { cardId })
                .execute();
        } catch (error) {
            throw new Error(`Failed to delete inventory: ${error.message}`);
        }
    }
}

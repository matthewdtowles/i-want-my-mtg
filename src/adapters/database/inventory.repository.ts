import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InventoryRepositoryPort } from "src/core/inventory/api/inventory.repository.port";
import { Inventory } from "src/core/inventory/inventory.entity";
import { Repository } from "typeorm";

@Injectable()
export class InventoryRepository implements InventoryRepositoryPort {

    constructor(
        @InjectRepository(Inventory) private readonly inventoryRepository: Repository<Inventory>
    ) { }

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        return await this.inventoryRepository.save(inventoryItems);
    }

    async findOne(_userId: number, _cardId: number): Promise<Inventory | null> {
        return await this.inventoryRepository.findOne({
            where: {
                userId: _userId,
                cardId: _cardId,
            },
            // TODO: needed? SHould this be split out?
            relations: ["card", "user"],
        });
    }

    async findByUser(_userId: number): Promise<Inventory[]> {
        return await this.inventoryRepository.find({
            where: {
                userId: _userId,
            },
            // TODO: needed? SHould this be split out?
            relations: ["card", "user"],
        });
    }

    async delete(userId: number, cardId: number): Promise<void> {
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

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryRepositoryPort } from "src/core/inventory/inventory.repository.port";
import { InventoryMapper } from "src/infrastructure/database/inventory/inventory.mapper";
import { InventoryOrmEntity } from "src/infrastructure/database/inventory/inventory.orm-entity";
import { In, Repository } from "typeorm";

@Injectable()
export class InventoryRepository implements InventoryRepositoryPort {

    constructor(@InjectRepository(InventoryOrmEntity) private readonly repository: Repository<InventoryOrmEntity>) { }

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        const ormItems: InventoryOrmEntity[] = inventoryItems.map((item: Inventory) => InventoryMapper.toOrmEntity(item));
        const savedItems: InventoryOrmEntity[] = await this.repository.save(ormItems);
        return savedItems.map((item: InventoryOrmEntity) => InventoryMapper.toCore(item));
    }

    async findOne(userId: number, cardId: string, isFoil: boolean): Promise<Inventory | null> {
        const item: InventoryOrmEntity = await this.repository.findOne({
            where: { userId, cardId, isFoil },
        });
        return item ? InventoryMapper.toCore(item) : null;
    }

    async findByCard(userId: number, cardId: string): Promise<Inventory[]> {
        const items = await this.repository.find({
            where: { userId, cardId },
        });
        return items.map((item: InventoryOrmEntity) => (InventoryMapper.toCore(item)));
    }

    async findByCards(userId: number, cardIds: string[]): Promise<Inventory[]> {
        const items = await this.repository.find({
            where: { userId, cardId: In(cardIds) },
        });
        return items.map((item: InventoryOrmEntity) => (InventoryMapper.toCore(item)));
    }

    async findByUser(userId: number): Promise<Inventory[]> {
        const items = await this.repository.find({
            where: { userId },
            relations: ["card"],
        });
        return items.map((item: InventoryOrmEntity) => (InventoryMapper.toCore(item)));
    }

    async delete(userId: number, cardId: string, foil: boolean): Promise<void> {
        try {
            await this.repository
                .createQueryBuilder()
                .delete()
                .from(InventoryOrmEntity)
                .where("userId = :userId", { userId })
                .andWhere("cardId = :cardId", { cardId })
                .andWhere("foil = :foil", { foil })
                .execute();
        } catch (error) {
            throw new Error(`Failed to delete inventory: ${error.message}`);
        }
    }

}

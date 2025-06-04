import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InventoryRepositoryPort } from "src/core/inventory/api/inventory.repository.port";
import { Inventory } from "src/core/inventory/inventory.entity";
import { Repository } from "typeorm";

@Injectable()
export class InventoryRepository implements InventoryRepositoryPort {

    constructor(@InjectRepository(Inventory) private readonly repository: Repository<Inventory>) { }

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        const savedItems: Inventory[] = [];
        for (const item of inventoryItems) {
            if (item.quantity > 0) {
                const savedItem: Inventory = await this.repository.save(item);
                savedItems.push(savedItem);
            } else {
                await this.delete(item.userId, item.cardId, item.isFoil);
                savedItems.push(item);
            }
        }
        return savedItems;
    }

    async findOne(_userId: number, _cardId: number, _isFoil: boolean): Promise<Inventory | null> {
        return await this.repository.findOne({
            where: {
                userId: _userId,
                cardId: _cardId,
                isFoil: _isFoil,
            },
            relations: ["card"],
        });
    }

    async findByCard(userId: number, cardId: number): Promise<Inventory[]> {
        return await this.repository.find({
            where: {
                userId: userId,
                cardId: cardId,
            },
            relations: ["card"],
        });
    }

    async findByUser(_userId: number): Promise<Inventory[]> {
        return await this.repository.find({
            where: {
                userId: _userId,
            },
            relations: ["card"],
        });
    }

    async delete(userId: number, cardId: number, foil: boolean): Promise<void> {
        try {
            await this.repository
                .createQueryBuilder()
                .delete()
                .from(Inventory)
                .where("userId = :userId", { userId })
                .andWhere("cardId = :cardId", { cardId })
                .andWhere("foil = :foil", { foil })
                .execute();
        } catch (error) {
            throw new Error(`Failed to delete inventory: ${error.message}`);
        }
    }
}

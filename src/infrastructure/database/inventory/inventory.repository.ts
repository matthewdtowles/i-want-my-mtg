import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Inventory, InventoryRepositoryPort } from "src/core/inventory";
import { InventoryOrmEntity } from "src/infrastructure/database/inventory/inventory.orm-entity";
import { Repository } from "typeorm";

@Injectable()
export class InventoryRepository implements InventoryRepositoryPort {

    constructor(@InjectRepository(InventoryOrmEntity) private readonly repository: Repository<InventoryOrmEntity>) { }

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        const savedItems: InventoryOrmEntity[] = [];
        for (const item of inventoryItems) {
            if (item.quantity > 0) {
                const ormItem: Partial<InventoryOrmEntity> = {
                    userId: item.userId,
                    cardId: item.cardId,
                    isFoil: item.isFoil,
                    quantity: item.quantity,
                };
                const savedItem: InventoryOrmEntity = await this.repository.save(ormItem);
                savedItems.push(savedItem);
            } else {
                await this.delete(item.userId, item.cardId, item.isFoil);
            }
        }
        return savedItems.map((item: InventoryOrmEntity) => {
            return {
                userId: item.userId,
                cardId: item.cardId,
                isFoil: item.isFoil,
                quantity: item.quantity,
                card: null,
                user: item.user ?? null,
            };
        });
    }

    async findOne(userId: number, cardId: string, isFoil: boolean): Promise<Inventory | null> {
        const item = await this.repository.findOne({
            where: { userId, cardId, isFoil },
            relations: ["card"],
        });
        if (!item) return null;
        return {
            userId: item.userId,
            cardId: item.cardId,
            isFoil: item.isFoil,
            quantity: item.quantity,
            card: null,
            user: item.user ?? null,
        };
    }

    async findByCard(userId: number, cardId: string): Promise<Inventory[]> {
        const items = await this.repository.find({
            where: { userId, cardId },
            relations: ["card"],
        });
        return items.map((item: InventoryOrmEntity) => ({
            userId: item.userId,
            cardId: item.cardId,
            isFoil: item.isFoil,
            quantity: item.quantity,
            card: null,
            user: item.user ?? null,
        }));
    }

    async findByUser(userId: number): Promise<Inventory[]> {
        const items = await this.repository.find({
            where: { userId },
            relations: ["card"],
        });
        return items.map((item: InventoryOrmEntity) => ({
            userId: item.userId,
            cardId: item.cardId,
            isFoil: item.isFoil,
            quantity: item.quantity,
            card: null,
            user: item.user ?? null,
        }));
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

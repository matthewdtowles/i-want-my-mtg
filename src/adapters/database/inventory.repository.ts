import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { InventoryRepositoryPort } from "src/core/inventory/api/inventory.repository.port";
import { Inventory } from "src/core/inventory/inventory.entity";
import { Repository } from "typeorm";

@Injectable()
export class InventoryRepository implements InventoryRepositoryPort {

    private readonly LOGGER: Logger = new Logger(InventoryRepository.name);

    constructor(@InjectRepository(Inventory) private readonly repository: Repository<Inventory>) { }

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        this.LOGGER.debug(`1 save ${inventoryItems.length} inventory items`);
        const savedItems: Inventory[] = [];
        for (const item of inventoryItems) {
            if (item.quantity > 0) {
                this.LOGGER.debug(`2 saving item: ${JSON.stringify(item)}`);
                const savedItem: Inventory = await this.repository.save(item);
                this.LOGGER.debug(`3 savedItem: ${JSON.stringify(savedItem)}`);
                savedItems.push(savedItem);
                this.LOGGER.debug(`4 savedItems.length (SO FAR): ${savedItems.length}`);
                this.LOGGER.debug(`5 savedItems (SO FAR): ${JSON.stringify(savedItems)}`);
            } else {
                this.LOGGER.debug(`6 deleting item: ${JSON.stringify(item)}`);
                await this.delete(item.userId, item.cardId);
                savedItems.push(item);
                this.LOGGER.debug(`7 savedItems.length (SO FAR): ${savedItems.length}`);
                this.LOGGER.debug(`8 savedItems (SO FAR): ${JSON.stringify(savedItems)}`);
            }
        }
        this.LOGGER.debug(`FINALE* * * * * * Inv Repository saved: ${JSON.stringify(savedItems)} inventory items`);
        return savedItems;
    }

    async findOne(_userId: number, _cardId: number): Promise<Inventory | null> {
        this.LOGGER.debug(`findOne userId: ${_userId}, cardId: ${_cardId}`);
        return await this.repository.findOne({
            where: {
                userId: _userId,
                cardId: _cardId,
            },
            relations: ["card"],
        });
    }

    async findByUser(_userId: number): Promise<Inventory[]> {
        this.LOGGER.debug(`findByUser userId: ${_userId}`);
        return await this.repository.find({
            where: {
                userId: _userId,
            },
            relations: ["card"],
        });
    }

    async delete(userId: number, cardId: number): Promise<void> {
        this.LOGGER.debug(`delete userId: ${userId}, cardId: ${cardId}`);
        try {
            await this.repository
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

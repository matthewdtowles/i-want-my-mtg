import { Inject, Injectable, Logger } from "@nestjs/common";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryRepositoryPort } from "src/core/inventory/inventory.repository.port";


@Injectable()
export class InventoryService {


    private readonly LOGGER: Logger = new Logger(InventoryService.name);

    constructor(@Inject(InventoryRepositoryPort) private readonly repository: InventoryRepositoryPort) { }

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        this.LOGGER.debug(`create ${inventoryItems.length} inventory items`);
        const toSave: Inventory[] = [];
        for (const item of inventoryItems) {
            if (item.quantity > 0) {
                toSave.push(item);
            } else {
                // await omitted intentionally
                this.repository.delete(item.userId, item.cardId, item.isFoil);
            }
        }
        return await this.repository.save(toSave);
    }

    async findForUser(userId: number, cardId: string): Promise<Inventory[]> {
        this.LOGGER.debug(`findForUser ${userId}, card: ${cardId}`);
        return userId && cardId ? await this.repository.findByCard(userId, cardId) : [];
    }

    async findAllCardsForUser(userId: number): Promise<Inventory[]> {
        this.LOGGER.debug(`findAllCardsForUser ${userId}`);
        return userId ? await this.repository.findByUser(userId) : [];
    }

    async getOwnedPercentageBySetCode(code: string, arg1: number): Promise<number> {
        return this.repository.getOwnedPercentageBySetCode(code, arg1);
    }

    async delete(userId: number, cardId: string, isFoil: boolean): Promise<boolean> {
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
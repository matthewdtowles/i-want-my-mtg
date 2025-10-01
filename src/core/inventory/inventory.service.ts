import { Inject, Injectable, Logger } from "@nestjs/common";
import { Inventory } from "src/core/inventory/inventory.entity";
import { InventoryRepositoryPort } from "src/core/inventory/inventory.repository.port";
import { Set } from "src/core/set/set.entity";


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

    async findAllForUser(userId: number, page: number, limit: number): Promise<Inventory[]> {
        this.LOGGER.debug(`findAllForUserWithPagination ${userId}, page: ${page}, limit: ${limit}`);
        return userId ? await this.repository.findByUser(userId, page, limit) : [];
    }

    async findForUser(userId: number, cardId: string): Promise<Inventory[]> {
        this.LOGGER.debug(`findForUser ${userId}, card: ${cardId}`);
        return userId && cardId ? await this.repository.findByCard(userId, cardId) : [];
    }

    async findByCards(userId: number, cardIds: string[]): Promise<Inventory[]> {
        this.LOGGER.debug(`findByCards for user: ${userId}`);
        if (!userId || !cardIds || cardIds.length === 0) {
            return [];
        }
        return await this.repository.findByCards(userId, cardIds);
    }

    async totalInventoryItemsForUser(userId: number): Promise<number> {
        this.LOGGER.debug(`totalInventoryItemsForUser ${userId}`);
        return await this.repository.totalInventoryItemsForUser(userId);
    }

    /**
     * Calculate the completion rate of a set based on the user's inventory.
     * Normal cards are counted, foils are not.
     * For foil completion rate, @see calcSetFoilCompletionRate.
     * 
     * @param set 
     * @param inventoryItems 
     * @returns 
     */
    async calcSetCompletionRate(set: Set, inventoryItems: Inventory[]): Promise<number> {
        this.LOGGER.debug(`calcSetCompletionRate for set: ${set.code}`);
        if (!set || !set.cards || set.cards.length === 0 || !inventoryItems || inventoryItems.length === 0) {
            return 0;
        }
        const totalCards: number = set.cards.filter(card => card.hasNonFoil).length;
        const totalOwned: number = inventoryItems.filter(item => item.isFoil === false
            && set.cards.some(card => card.id === item.cardId)).length;
        if (totalCards === 0 || totalOwned === 0) {
            return 0;
        }
        if (totalOwned === totalCards) {
            return 100;
        }
        const completionRate: number = Math.round((totalOwned / totalCards) * 100);
        if (completionRate >= 100) {
            return 99;
        }
        return completionRate;
    }

    /**
     * Calculate the foil completion rate of a set based on the user's inventory.
     * Normal cards are not counted, foils are.
     * For normal completion rate, @see calcSetCompletionRate.
     *
     * @param set
     * @param inventoryItems
     * @returns
     */
    async calcSetFoilCompletionRate(set: Set, inventoryItems: Inventory[]): Promise<number> {
        this.LOGGER.debug(`calcSetFoilCompletionRate for set: ${set.code}`);
        if (!set || !set.cards || set.cards.length === 0 || !inventoryItems || inventoryItems.length === 0) {
            return 0;
        }
        const totalFoilCards: number = set.cards.filter(card => card.hasFoil).length;
        const totalFoilOwned: number = inventoryItems.filter(item => item.isFoil === true
            && set.cards.some(card => card.id === item.cardId)).length;
        if (totalFoilCards === 0 || totalFoilOwned === 0) {
            return 0;
        }
        if (totalFoilOwned === totalFoilCards) {
            return 100;
        }
        const completionRate: number = Math.round((totalFoilOwned / totalFoilCards) * 100);
        if (completionRate >= 100) {
            return 99;
        }
        return completionRate;
    }

    async delete(userId: number, cardId: string, isFoil: boolean): Promise<boolean> {
        this.LOGGER.debug(`delete inventory entry for user: ${userId}, card: ${cardId}, foil: ${isFoil}`);
        let result = false;
        if (userId && cardId) {
            try {
                await this.repository.delete(userId, cardId, isFoil);
                const foundItem: Inventory | null = await this.repository.findOne(userId, cardId, isFoil);
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
import { Inject, Injectable } from "@nestjs/common";
import { SafeQueryOptions } from "src/core/query/safe-query-options.dto";
import { Set } from "src/core/set/set.entity";
import { getLogger } from "src/logger/global-app-logger";
import { Inventory } from "./inventory.entity";
import { InventoryRepositoryPort } from "./inventory.repository.port";


@Injectable()
export class InventoryService {

    private readonly LOGGER = getLogger(InventoryService.name);

    constructor(@Inject(InventoryRepositoryPort) private readonly repository: InventoryRepositoryPort) { }

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        this.LOGGER.debug(`create ${inventoryItems.length} inventory items.`);
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

    async findAllForUser(userId: number, options: SafeQueryOptions): Promise<Inventory[]> {
        this.LOGGER.debug(`findAllForUserWithPagination ${userId}, page: ${options.page}, limit: ${options.limit}, filter: ${options.filter}.`);
        return userId ? await this.repository.findByUser(userId, options) : [];
    }

    async findForUser(userId: number, cardId: string): Promise<Inventory[]> {
        this.LOGGER.debug(`findForUser ${userId}, card: ${cardId}.`);
        return userId && cardId ? await this.repository.findByCard(userId, cardId) : [];
    }

    async findByCards(userId: number, cardIds: string[]): Promise<Inventory[]> {
        this.LOGGER.debug(`findByCards for user: ${userId}.`);
        if (!userId || !cardIds || cardIds.length === 0) {
            return [];
        }
        return await this.repository.findByCards(userId, cardIds);
    }

    async completionRateAll(userId: number): Promise<number> {
        this.LOGGER.debug(`Get owned % for all cards.`);
        const totalOwned = await this.repository.totalInventoryCards(userId, new SafeQueryOptions({}));
        const totalCards = await this.repository.totalCards();
        const completionRate = this.completionRate(totalOwned, totalCards);
        this.LOGGER.debug(`Completion rate for all cards: ${completionRate}%.`);
        return completionRate;
    }

    async completionRateForSet(userId: number, setCode: string): Promise<number> {
        this.LOGGER.debug(`Get owned % for cards in set ${setCode}.`);
        const totalOwned = await this.repository.totalInventoryCardsForSet(userId, setCode);
        const totalCards = await this.repository.totalCardsInSet(setCode);
        const completionRate = this.completionRate(totalOwned, totalCards);
        this.LOGGER.debug(`Completion rate for set ${setCode} ${completionRate}%.`);
        return completionRate;
    }

    async totalInventoryItems(userId: number, options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`totalInventoryItemsForUser ${userId}, filter: ${options.filter}.`);
        return await this.repository.totalInventoryCards(userId, options);
    }

    async totalValue(userId: number): Promise<number> {
        this.LOGGER.debug(`Calculate total value for user ${userId}.`);
        const totalValue = await this.repository.totalInventoryValue(userId);
        this.LOGGER.debug(`User ${userId} inventory value ${totalValue}.`);
        return totalValue;
    }

    async totalValueForSet(userId: number, setCode: string): Promise<number> {
        this.LOGGER.debug(`Calculate total value for user ${userId} in set ${setCode}.`);
        const totalValue = await this.repository.totalInventoryValueForSet(userId, setCode);
        this.LOGGER.debug(`User ${userId} inventory value ${totalValue} for set ${setCode}.`);
        return totalValue;
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

    private completionRate(totalOwned: number, totalCards: number): number {
        if (totalCards === 0 || totalOwned === 0) return 0;
        if (totalOwned === totalCards) return 100;
        const completionRate = Math.round((totalOwned / totalCards) * 100);
        return completionRate > 100 ? 99 : completionRate;
    }
}
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

    // TODO: differentiate for completion rate of main set vs whole set and variants
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

    async totalOwnedValue(userId: number): Promise<number> {
        this.LOGGER.debug(`Calculate total value for user ${userId}.`);
        const totalValue = await this.repository.totalInventoryValue(userId);
        this.LOGGER.debug(`User ${userId} inventory value ${totalValue}.`);
        return totalValue;
    }

    async ownedValueForSet(userId: number, setCode: string): Promise<number> {
        this.LOGGER.debug(`Calculate owned value for user ${userId} in set ${setCode}.`);
        const ownedValue = await this.repository.totalInventoryValueForSet(userId, setCode);
        this.LOGGER.debug(`User ${userId} inventory value ${ownedValue} for set ${setCode}.`);
        return ownedValue;
    }

    async delete(userId: number, cardId: string, isFoil: boolean): Promise<boolean> {
        this.LOGGER.debug(`delete inventory entry for user: ${userId}, card: ${cardId}, foil: ${isFoil}`);
        if (userId && cardId) {
            try {
                await this.repository.delete(userId, cardId, isFoil);
                const foundItem: Inventory | null = await this.repository.findOne(userId, cardId, isFoil);
                return foundItem ? false : true;
            }
            catch (error) {
                this.LOGGER.error(`Failed to delete inventory: ${error.message}`);
            }
        }
        return false;
    }

    private completionRate(totalOwned: number, totalCards: number): number {
        if (totalCards === 0 || totalOwned === 0) return 0;
        if (totalOwned === totalCards) return 100;
        const completionRate = (totalOwned / totalCards) * 100;
        return Math.round(completionRate * 100) / 100;
    }
}
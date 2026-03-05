import { Inject, Injectable } from '@nestjs/common';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { TransactionRepositoryPort } from 'src/core/transaction/transaction.repository.port';
import { getLogger } from 'src/logger/global-app-logger';
import { Inventory } from './inventory.entity';
import { InventoryRepositoryPort } from './inventory.repository.port';

@Injectable()
export class InventoryService {
    private readonly LOGGER = getLogger(InventoryService.name);

    constructor(
        @Inject(InventoryRepositoryPort) private readonly repository: InventoryRepositoryPort,
        @Inject(TransactionRepositoryPort)
        private readonly transactionRepository: TransactionRepositoryPort
    ) {}

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        this.LOGGER.debug(`create ${inventoryItems.length} inventory items.`);
        const toSave: Inventory[] = [];
        for (const item of inventoryItems) {
            if (item.quantity > 0) {
                const minQty = await this.getTransactionDerivedQuantity(
                    item.userId,
                    item.cardId,
                    item.isFoil
                );
                if (item.quantity < minQty) {
                    throw new Error(
                        `Cannot set inventory to ${item.quantity}. ` +
                            `${minQty} units are accounted for in transactions. ` +
                            `Record a SELL transaction to reduce below this amount.`
                    );
                }
                toSave.push(item);
            } else {
                const minQty = await this.getTransactionDerivedQuantity(
                    item.userId,
                    item.cardId,
                    item.isFoil
                );
                if (minQty > 0) {
                    throw new Error(
                        `Cannot remove inventory. ` +
                            `${minQty} units are accounted for in transactions. ` +
                            `Record a SELL transaction to reduce below this amount.`
                    );
                }
                // await omitted intentionally
                this.repository.delete(item.userId, item.cardId, item.isFoil);
            }
        }
        return await this.repository.save(toSave);
    }

    private async getTransactionDerivedQuantity(
        userId: number,
        cardId: string,
        isFoil: boolean
    ): Promise<number> {
        const buyLots = await this.transactionRepository.findBuyLots(userId, cardId, isFoil);
        const sells = await this.transactionRepository.findSells(userId, cardId, isFoil);
        const totalBought = buyLots.reduce((sum, t) => sum + t.quantity, 0);
        const totalSold = sells.reduce((sum, t) => sum + t.quantity, 0);
        return Math.max(0, totalBought - totalSold);
    }

    async findAllForUser(userId: number, options: SafeQueryOptions): Promise<Inventory[]> {
        this.LOGGER.debug(
            `findAllForUserWithPagination ${userId}, page: ${options.page}, limit: ${options.limit}, filter: ${options.filter}.`
        );
        const inventoryList = userId ? await this.repository.findByUser(userId, options) : [];
        this.LOGGER.debug(
            `Found ${inventoryList.length} cards for user ${userId} with pagination.`
        );
        return inventoryList;
    }

    async findForUser(userId: number, cardId: string): Promise<Inventory[]> {
        this.LOGGER.debug(`findForUser ${userId}, card: ${cardId}.`);
        const inventoryList =
            userId && cardId ? await this.repository.findByCard(userId, cardId) : [];
        this.LOGGER.debug(`Found ${inventoryList.length} cards for user ${userId}.`);
        return inventoryList;
    }

    async findByCards(userId: number, cardIds: string[]): Promise<Inventory[]> {
        this.LOGGER.debug(`findByCards for user: ${userId}.`);
        const inventoryList =
            userId && cardIds && cardIds.length > 0
                ? await this.repository.findByCards(userId, cardIds)
                : [];
        this.LOGGER.debug(`Found ${inventoryList.length} cards by cards given for user ${userId}.`);
        return inventoryList;
    }

    async totalCards(): Promise<number> {
        this.LOGGER.debug(`Get total number of cards in existence.`);
        const result = await this.repository.totalCards();
        this.LOGGER.debug(`Total number of existing cards is ${result}`);
        return result;
    }

    async totalInventoryItems(userId: number, options: SafeQueryOptions): Promise<number> {
        this.LOGGER.debug(`totalInventoryItemsForUser ${userId}, filter: ${options.filter}.`);
        const result = await this.repository.totalInventoryCards(userId, options);
        this.LOGGER.debug(`Total inventory items for user ${userId} is ${result}.`);
        return result;
    }

    async totalInventoryItemsForSet(userId: number, setCode: string): Promise<number> {
        this.LOGGER.debug(`Get total inventory items for ${userId} in set ${setCode}.`);
        const result = await this.repository.totalInventoryCardsForSet(userId, setCode);
        this.LOGGER.debug(
            `Total inventory items for user ${userId} in set ${setCode} is ${result}.`
        );
        return result;
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
        this.LOGGER.debug(
            `delete inventory entry for user: ${userId}, card: ${cardId}, foil: ${isFoil}`
        );
        if (userId && cardId) {
            const minQty = await this.getTransactionDerivedQuantity(userId, cardId, isFoil);
            if (minQty > 0) {
                throw new Error(
                    `Cannot delete inventory. ` +
                        `${minQty} units are accounted for in transactions. ` +
                        `Record a SELL transaction to reduce below this amount.`
                );
            }
            try {
                await this.repository.delete(userId, cardId, isFoil);
                const foundItem: Inventory | null = await this.repository.findOne(
                    userId,
                    cardId,
                    isFoil
                );
                return foundItem ? false : true;
            } catch (error) {
                this.LOGGER.error(`Failed to delete inventory: ${error.message}`);
            }
        }
        return false;
    }
}

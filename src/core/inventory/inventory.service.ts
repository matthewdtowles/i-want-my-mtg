import { Inject, Injectable } from '@nestjs/common';
import { GranularPriceRepositoryPort } from 'src/core/card/ports/granular-price.repository.port';
import { buildSellPlan, SellPlan } from 'src/core/pricing/sell-value.policy';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { TransactionRunnerPort } from 'src/core/transaction-runner.port';
import { getLogger } from 'src/logger/global-app-logger';
import { Inventory } from './inventory.entity';
import { InventoryRepositoryPort } from './ports/inventory.repository.port';

/** An inventory key as selected on the sell view: one card in one finish. */
export interface InventoryKey {
    cardId: string;
    isFoil: boolean;
}

@Injectable()
export class InventoryService {
    private readonly LOGGER = getLogger(InventoryService.name);

    constructor(
        @Inject(InventoryRepositoryPort) private readonly repository: InventoryRepositoryPort,
        @Inject(GranularPriceRepositoryPort)
        private readonly granularPriceRepository: GranularPriceRepositoryPort,
        @Inject(TransactionRunnerPort) private readonly txRunner: TransactionRunnerPort
    ) {}

    async save(inventoryItems: Inventory[]): Promise<Inventory[]> {
        this.LOGGER.debug(`create ${inventoryItems.length} inventory items.`);
        // Collapse duplicate (userId, cardId, isFoil) entries to the last one
        // (last-write-wins). Otherwise a trailing removal for a key would be
        // undone by an earlier positive entry re-saved after the delete (W2/B3).
        const byKey = new Map<string, Inventory>();
        for (const item of inventoryItems) {
            byKey.set(`${item.userId}:${item.cardId}:${item.isFoil}`, item);
        }
        const toSave: Inventory[] = [];
        for (const item of byKey.values()) {
            if (item.quantity > 0) {
                toSave.push(item);
            } else {
                // Await the delete: a fire-and-forget rejection here is an
                // unhandled promise rejection (process crash on Node >=15) and
                // silently corrupts inventory when it fails (W2/B3).
                await this.repository.delete(item.userId, item.cardId, item.isFoil);
            }
        }
        return await this.repository.save(toSave);
    }

    /**
     * Add `delta` (positive or negative) to one holding's quantity and return
     * the resulting quantity. Positive deltas create the row if absent; a
     * result of 0 or less removes it (returns 0). Runs inside a transaction
     * with a row lock so concurrent adjustments serialize instead of losing
     * updates (the read-modify-write race the absolute-quantity API has).
     */
    async adjustQuantity(
        userId: number,
        cardId: string,
        isFoil: boolean,
        delta: number
    ): Promise<number> {
        this.LOGGER.debug(`adjustQuantity ${delta} of ${cardId} (foil=${isFoil}) for ${userId}.`);
        return await this.txRunner.run(async () => {
            const existing = await this.repository.findOneForUpdate(userId, cardId, isFoil);
            const next = Math.max(0, (existing?.quantity ?? 0) + delta);
            if (next === 0) {
                if (existing) await this.repository.delete(userId, cardId, isFoil);
                return 0;
            }
            await this.repository.save([new Inventory({ userId, cardId, isFoil, quantity: next })]);
            return next;
        });
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

    /**
     * Take a row lock on one holding (user + card + finish) so concurrent
     * ledger mutations serialize. Must run inside a TransactionRunner unit of
     * work; the transaction service calls this before its remaining-quantity
     * check to close the oversell race (W2/B4).
     */
    async lockForUpdate(userId: number, cardId: string, isFoil: boolean): Promise<void> {
        await this.repository.findOneForUpdate(userId, cardId, isFoil);
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

    async inventoryTotalsForSets(userId: number, setCodes: string[]): Promise<Map<string, number>> {
        this.LOGGER.debug(`Get inventory totals for ${setCodes.length} sets for user ${userId}.`);
        if (!userId || setCodes.length === 0) return new Map();
        return this.repository.totalInventoryCardsForSets(userId, setCodes);
    }

    async ownedValuesForSets(userId: number, setCodes: string[]): Promise<Map<string, number>> {
        this.LOGGER.debug(`Get owned values for ${setCodes.length} sets for user ${userId}.`);
        if (!userId || setCodes.length === 0) return new Map();
        return this.repository.totalInventoryValuesForSets(userId, setCodes);
    }

    async ownedValueForSet(userId: number, setCode: string): Promise<number> {
        this.LOGGER.debug(`Calculate owned value for user ${userId} in set ${setCode}.`);
        const ownedValue = await this.repository.totalInventoryValueForSet(userId, setCode);
        this.LOGGER.debug(`User ${userId} inventory value ${ownedValue} for set ${setCode}.`);
        return ownedValue;
    }

    /**
     * Market sell value (6.4): the user's inventory matched against current
     * buylist offers. `selection` narrows the plan to specific items (the sell
     * view's checkboxes); omitted = whole inventory. Selection keys are matched
     * against the user's own items, so foreign card ids are simply ignored.
     */
    async sellPlanForUser(userId: number, selection?: InventoryKey[]): Promise<SellPlan> {
        this.LOGGER.debug(`sellPlanForUser ${userId}, selection: ${selection?.length ?? 'all'}.`);
        if (!userId) return buildSellPlan([], []);
        if (selection && selection.length === 0) return buildSellPlan([], []);
        let items = await this.repository.findAllForExport(userId);
        if (selection) {
            const selected = new Set(selection.map((k) => `${k.cardId}|${k.isFoil}`));
            items = items.filter((i) => selected.has(`${i.cardId}|${i.isFoil}`));
        }
        const cardIds = [...new Set(items.map((i) => i.cardId))];
        const offers = await this.granularPriceRepository.findCurrentBuylistByCardIds(cardIds);
        const plan = buildSellPlan(items, offers);
        this.LOGGER.debug(
            `Sell plan for user ${userId}: ${plan.itemsWithOffers} items with offers, total ${plan.totalPayout}.`
        );
        return plan;
    }

    async delete(userId: number, cardId: string, isFoil: boolean): Promise<boolean> {
        this.LOGGER.debug(
            `delete inventory entry for user: ${userId}, card: ${cardId}, foil: ${isFoil}`
        );
        if (userId && cardId) {
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

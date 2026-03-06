import { Inject, Injectable } from '@nestjs/common';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { getLogger } from 'src/logger/global-app-logger';
import { EDIT_WINDOW_MS } from './transaction.constants';
import { Transaction } from './transaction.entity';
import { TransactionRepositoryPort } from './transaction.repository.port';

export interface LotAllocation {
    readonly lotId: number;
    readonly quantity: number;
    readonly costPerUnit: number;
    readonly realizedGain: number;
}

export interface CostBasisSummary {
    readonly totalCost: number;
    readonly totalQuantity: number;
    readonly averageCost: number;
    readonly unrealizedGain: number;
    readonly realizedGain: number;
}

@Injectable()
export class TransactionService {
    private readonly LOGGER = getLogger(TransactionService.name);

    constructor(
        @Inject(TransactionRepositoryPort)
        private readonly repository: TransactionRepositoryPort,
        @Inject(InventoryService)
        private readonly inventoryService: InventoryService
    ) {}

    async create(
        transaction: Transaction,
        options?: { skipInventorySync?: boolean }
    ): Promise<Transaction> {
        this.LOGGER.debug(
            `Creating ${transaction.type} transaction for user ${transaction.userId}, card ${transaction.cardId}.`
        );

        if (transaction.quantity <= 0) {
            throw new Error('Transaction quantity must be positive.');
        }
        if (transaction.pricePerUnit < 0) {
            throw new Error('Price per unit cannot be negative.');
        }
        if (transaction.type !== 'BUY' && transaction.type !== 'SELL') {
            throw new Error('Transaction type must be BUY or SELL.');
        }

        if (transaction.type === 'SELL') {
            const remainingQty = await this.getRemainingQuantity(
                transaction.userId,
                transaction.cardId,
                transaction.isFoil
            );
            if (transaction.quantity > remainingQty) {
                throw new Error(
                    `Cannot sell ${transaction.quantity} units. Only ${remainingQty} remaining.`
                );
            }
        }

        const saved = await this.repository.save(transaction);
        this.LOGGER.debug(`Created transaction id ${saved.id}.`);

        if (!options?.skipInventorySync) {
            const delta = transaction.type === 'BUY' ? transaction.quantity : -transaction.quantity;
            await this.adjustInventory(
                transaction.userId,
                transaction.cardId,
                transaction.isFoil,
                delta
            );
        }

        return saved;
    }

    async findById(id: number): Promise<Transaction | null> {
        this.LOGGER.debug(`Finding transaction ${id}.`);
        return this.repository.findById(id);
    }

    async findByUserAndCard(
        userId: number,
        cardId: string,
        isFoil?: boolean
    ): Promise<Transaction[]> {
        this.LOGGER.debug(`Finding transactions for user ${userId}, card ${cardId}.`);
        return this.repository.findByUserAndCard(userId, cardId, isFoil);
    }

    async findByUser(userId: number): Promise<Transaction[]> {
        this.LOGGER.debug(`Finding all transactions for user ${userId}.`);
        return this.repository.findByUser(userId);
    }

    async update(
        id: number,
        userId: number,
        fields: Partial<Transaction>
    ): Promise<{ updated: Transaction; oldQuantity: number }> {
        this.LOGGER.debug(`Updating transaction ${id} for user ${userId}.`);
        const existing = await this.repository.findById(id);
        if (!existing || existing.userId !== userId) {
            throw new Error('Transaction not found.');
        }

        this.assertWithinEditWindow(existing.createdAt, 'edited');

        if (fields.quantity !== undefined && fields.quantity <= 0) {
            throw new Error('Transaction quantity must be positive.');
        }
        if (fields.pricePerUnit !== undefined && fields.pricePerUnit < 0) {
            throw new Error('Price per unit cannot be negative.');
        }

        const newQuantity = fields.quantity ?? existing.quantity;
        if (fields.quantity !== undefined) {
            const remainingQty = await this.getRemainingQuantity(
                existing.userId,
                existing.cardId,
                existing.isFoil
            );

            if (existing.type === 'SELL') {
                // Add back the old sell quantity, then check if the new sell quantity fits
                const available = remainingQty + existing.quantity;
                if (newQuantity > available) {
                    throw new Error(
                        `Cannot sell ${newQuantity} units. Only ${available} remaining.`
                    );
                }
            } else if (existing.type === 'BUY' && newQuantity < existing.quantity) {
                // Reducing a BUY lot: ensure total bought doesn't drop below total sold
                const reduction = existing.quantity - newQuantity;
                if (reduction > remainingQty) {
                    throw new Error(
                        `Cannot reduce buy to ${newQuantity} units. ${remainingQty} unsold units remaining in this card's ledger.`
                    );
                }
            }
        }

        const oldQuantity = existing.quantity;
        const updated = await this.repository.update(id, userId, fields);

        // Sync inventory if quantity changed
        if (fields.quantity !== undefined && fields.quantity !== oldQuantity) {
            const quantityDelta = fields.quantity - oldQuantity;
            // BUY: more bought = more inventory; SELL: more sold = less inventory
            const inventoryDelta = existing.type === 'BUY' ? quantityDelta : -quantityDelta;
            await this.adjustInventory(
                existing.userId,
                existing.cardId,
                existing.isFoil,
                inventoryDelta
            );
        }

        this.LOGGER.debug(`Updated transaction ${id}.`);
        return { updated, oldQuantity };
    }

    async delete(id: number, userId: number): Promise<void> {
        this.LOGGER.debug(`Deleting transaction ${id} for user ${userId}.`);
        const existing = await this.repository.findById(id);
        if (!existing || existing.userId !== userId) {
            throw new Error('Transaction not found.');
        }

        this.assertWithinEditWindow(existing.createdAt, 'deleted');

        if (existing.type === 'BUY') {
            const remainingQty = await this.getRemainingQuantity(
                existing.userId,
                existing.cardId,
                existing.isFoil
            );
            if (existing.quantity > remainingQty) {
                throw new Error(
                    `Cannot delete buy of ${existing.quantity} units. Only ${remainingQty} unsold units remaining in this card's ledger.`
                );
            }
        }

        await this.repository.delete(id, userId);

        // Reverse the inventory effect: BUY delete decrements, SELL delete increments
        const delta = existing.type === 'BUY' ? -existing.quantity : existing.quantity;
        await this.adjustInventory(existing.userId, existing.cardId, existing.isFoil, delta);

        this.LOGGER.debug(`Deleted transaction ${id}.`);
    }

    /**
     * Calculate remaining quantity for a card by subtracting SELL totals from BUY totals.
     */
    async getRemainingQuantity(userId: number, cardId: string, isFoil: boolean): Promise<number> {
        const buyLots = await this.repository.findBuyLots(userId, cardId, isFoil);
        const sells = await this.repository.findSells(userId, cardId, isFoil);

        const totalBought = buyLots.reduce((sum, t) => sum + t.quantity, 0);
        const totalSold = sells.reduce((sum, t) => sum + t.quantity, 0);
        return totalBought - totalSold;
    }

    /**
     * Compute FIFO lot allocations for sells against buy lots.
     * Returns the remaining lots with their remaining quantities and costs.
     */
    async getFifoLotAllocations(
        userId: number,
        cardId: string,
        isFoil: boolean
    ): Promise<{
        lots: Array<{ lotId: number; remaining: number; costPerUnit: number }>;
        totalSoldCost: number;
        totalRealizedGain: number;
    }> {
        const buyLots = await this.repository.findBuyLots(userId, cardId, isFoil);
        const sells = await this.repository.findSells(userId, cardId, isFoil);

        let totalSoldCost = 0;
        let totalRealizedGain = 0;

        // Track remaining quantity per buy lot for FIFO consumption
        const lotRemaining = buyLots.map((lot) => ({
            lotId: lot.id,
            remaining: lot.quantity,
            costPerUnit: lot.pricePerUnit,
        }));

        // Iterate sells in date order; for each sell, consume buy lots FIFO
        let lotIndex = 0;
        for (const sell of sells) {
            let sellRemaining = sell.quantity;
            while (sellRemaining > 0 && lotIndex < lotRemaining.length) {
                const lot = lotRemaining[lotIndex];
                const consumed = Math.min(lot.remaining, sellRemaining);
                lot.remaining -= consumed;
                sellRemaining -= consumed;
                totalSoldCost += consumed * lot.costPerUnit;
                totalRealizedGain += consumed * (sell.pricePerUnit - lot.costPerUnit);
                if (lot.remaining === 0) {
                    lotIndex++;
                }
            }
        }

        const lots = lotRemaining.filter((lot) => lot.remaining > 0);

        return { lots, totalSoldCost, totalRealizedGain };
    }

    /**
     * Get cost basis summary for a user's card holding.
     */
    async getCostBasis(
        userId: number,
        cardId: string,
        isFoil: boolean,
        currentMarketPrice: number
    ): Promise<CostBasisSummary> {
        this.LOGGER.debug(
            `Calculating cost basis for user ${userId}, card ${cardId}, foil ${isFoil}.`
        );

        const { lots, totalRealizedGain } = await this.getFifoLotAllocations(
            userId,
            cardId,
            isFoil
        );

        const totalQuantity = lots.reduce((sum, lot) => sum + lot.remaining, 0);
        const totalCost = lots.reduce((sum, lot) => sum + lot.remaining * lot.costPerUnit, 0);
        const averageCost = totalQuantity > 0 ? totalCost / totalQuantity : 0;
        const unrealizedGain = totalQuantity * (currentMarketPrice - averageCost);

        return {
            totalCost,
            totalQuantity,
            averageCost,
            unrealizedGain,
            realizedGain: totalRealizedGain,
        };
    }

    private assertWithinEditWindow(
        createdAt: Date | undefined,
        action: 'edited' | 'deleted'
    ): void {
        const timestamp = createdAt ? new Date(createdAt).getTime() : NaN;
        if (isNaN(timestamp) || Date.now() - timestamp >= EDIT_WINDOW_MS) {
            throw new Error(`Transactions can only be ${action} within 24 hours of creation.`);
        }
    }

    /**
     * Adjust inventory quantity by a delta (positive = add, negative = subtract).
     * Creates inventory entry if it doesn't exist. Saves with quantity 0 to trigger deletion
     * if resulting quantity would be <= 0.
     */
    private async adjustInventory(
        userId: number,
        cardId: string,
        isFoil: boolean,
        delta: number
    ): Promise<void> {
        this.LOGGER.debug(
            `Adjusting inventory for user ${userId}, card ${cardId}, foil ${isFoil}, delta ${delta}.`
        );
        const existing = await this.inventoryService.findForUser(userId, cardId);
        const match = existing.find((inv) => inv.isFoil === isFoil);
        const currentQty = match ? match.quantity : 0;
        const newQty = Math.max(0, currentQty + delta);

        await this.inventoryService.save([
            new Inventory({
                cardId,
                userId,
                isFoil,
                quantity: newQty,
            }),
        ]);
    }
}

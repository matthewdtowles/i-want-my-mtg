import { Inject, Injectable } from '@nestjs/common';
import { getLogger } from 'src/logger/global-app-logger';
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
        private readonly repository: TransactionRepositoryPort
    ) {}

    async create(transaction: Transaction): Promise<Transaction> {
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

    async delete(id: number, userId: number): Promise<void> {
        this.LOGGER.debug(`Deleting transaction ${id} for user ${userId}.`);
        const existing = await this.repository.findById(id);
        if (!existing || existing.userId !== userId) {
            throw new Error('Transaction not found.');
        }
        await this.repository.delete(id, userId);
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

        const totalToSell = sells.reduce((sum, t) => sum + t.quantity, 0);
        let sellRemaining = totalToSell;
        let totalSoldCost = 0;
        let totalRealizedGain = 0;

        // Compute weighted average sell price for realized gain calculation
        const totalSellRevenue = sells.reduce((sum, t) => sum + t.quantity * t.pricePerUnit, 0);
        const avgSellPrice = totalToSell > 0 ? totalSellRevenue / totalToSell : 0;

        const lots = buyLots
            .map((lot) => {
                if (sellRemaining <= 0) {
                    return {
                        lotId: lot.id,
                        remaining: lot.quantity,
                        costPerUnit: lot.pricePerUnit,
                    };
                }

                const consumed = Math.min(lot.quantity, sellRemaining);
                sellRemaining -= consumed;
                totalSoldCost += consumed * lot.pricePerUnit;
                totalRealizedGain += consumed * (avgSellPrice - lot.pricePerUnit);

                return {
                    lotId: lot.id,
                    remaining: lot.quantity - consumed,
                    costPerUnit: lot.pricePerUnit,
                };
            })
            .filter((lot) => lot.remaining > 0);

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
}

import { Inject, Injectable } from '@nestjs/common';
import { Inventory } from 'src/core/inventory/inventory.entity';
import { Transaction } from 'src/core/transaction/transaction.entity';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { getLogger } from 'src/logger/global-app-logger';
import { PortfolioCardPerformance } from './portfolio-card-performance.entity';

export interface ComputedPortfolio {
    userId: number;
    totalValue: number;
    totalCost: number | null;
    totalRealizedGain: number | null;
    totalCards: number;
    totalQuantity: number;
    computedAt: Date;
    performances: PortfolioCardPerformance[];
}

@Injectable()
export class PortfolioComputationService {
    private readonly LOGGER = getLogger(PortfolioComputationService.name);

    constructor(
        @Inject(TransactionService)
        private readonly transactionService: TransactionService
    ) {}

    /**
     * Pure computation: given pre-fetched inventory + transactions + totalValue,
     * compute portfolio summary and per-card performance data.
     *
     * useFifo=true (premium): FIFO lot matching, realized gains tracked per sale.
     * useFifo=false (free): perpetual average cost basis (sum(buy_value)/sum(buy_qty)),
     * no realized gain tracking. Both produce per-card performance rows.
     */
    compute(
        userId: number,
        inventoryItems: Inventory[],
        transactions: Transaction[],
        totalValue: number,
        useFifo = true
    ): ComputedPortfolio {
        this.LOGGER.debug(`Computing portfolio for user ${userId} (useFifo=${useFifo}).`);

        const hasTransactions = transactions.length > 0;
        const now = new Date();

        let totalCost: number | null = null;
        let totalRealizedGain: number | null = null;
        const performances: PortfolioCardPerformance[] = [];

        if (hasTransactions) {
            totalCost = 0;
            totalRealizedGain = useFifo ? 0 : null;

            const inventoryMap = new Map<string, Inventory>();
            const cardFoilKeys = new Set<string>();
            for (const inv of inventoryItems) {
                const key = `${inv.cardId}:${inv.isFoil}`;
                inventoryMap.set(key, inv);
                cardFoilKeys.add(key);
            }
            const transactionCardKeys = new Set<string>();

            const buysByKey = new Map<string, Transaction[]>();
            const sellsByKey = new Map<string, Transaction[]>();
            for (const tx of transactions) {
                const key = `${tx.cardId}:${tx.isFoil}`;
                transactionCardKeys.add(key);
                cardFoilKeys.add(key);
                if (tx.type === 'BUY') {
                    const buys = buysByKey.get(key) || [];
                    buys.push(tx);
                    buysByKey.set(key, buys);
                } else {
                    const sells = sellsByKey.get(key) || [];
                    sells.push(tx);
                    sellsByKey.set(key, sells);
                }
            }

            const dateSorter = (a: { date: Date }, b: { date: Date }) =>
                new Date(a.date).getTime() - new Date(b.date).getTime();
            for (const buys of buysByKey.values()) buys.sort(dateSorter);
            for (const sells of sellsByKey.values()) sells.sort(dateSorter);

            for (const key of cardFoilKeys) {
                const [cardId, foilStr] = key.split(':');
                const isFoil = foilStr === 'true';

                const inventoryItem = inventoryMap.get(key);
                const quantity = inventoryItem?.quantity ?? 0;

                let marketPrice = 0;
                if (inventoryItem?.card?.prices?.[0]) {
                    const price = inventoryItem.card.prices[0];
                    marketPrice = isFoil ? (price.foil ?? 0) : (price.normal ?? price.foil ?? 0);
                }

                const currentValue = quantity * marketPrice;

                const buys = buysByKey.get(key) || [];
                const sells = sellsByKey.get(key) || [];

                let cardTotalCost: number;
                let averageCost: number;
                let cardRealizedGain: number;

                if (useFifo) {
                    const fifo = this.transactionService.computeFifoFromTransactions(buys, sells);
                    const lotTotalCost = fifo.lots.reduce(
                        (sum, lot) => sum + lot.remaining * lot.costPerUnit,
                        0
                    );
                    const lotQuantity = fifo.lots.reduce((sum, lot) => sum + lot.remaining, 0);
                    averageCost = lotQuantity > 0 ? lotTotalCost / lotQuantity : 0;
                    cardTotalCost = lotTotalCost;
                    cardRealizedGain = fifo.totalRealizedGain;
                    totalRealizedGain! += cardRealizedGain;
                } else {
                    // Perpetual average: avg = sum(buy_value)/sum(buy_qty); cost = qty × avg.
                    let buyValue = 0;
                    let buyQty = 0;
                    for (const b of buys) {
                        buyValue += b.quantity * b.pricePerUnit;
                        buyQty += b.quantity;
                    }
                    averageCost = buyQty > 0 ? buyValue / buyQty : 0;
                    cardTotalCost = quantity * averageCost;
                    cardRealizedGain = 0;
                }

                const unrealizedGain = quantity * (marketPrice - averageCost);
                totalCost += cardTotalCost;

                const roiPercent =
                    cardTotalCost > 0
                        ? ((currentValue - cardTotalCost) / cardTotalCost) * 100
                        : null;

                if (transactionCardKeys.has(key)) {
                    performances.push(
                        new PortfolioCardPerformance({
                            userId,
                            cardId,
                            isFoil,
                            quantity,
                            totalCost: cardTotalCost,
                            averageCost,
                            currentValue,
                            unrealizedGain,
                            realizedGain: cardRealizedGain,
                            roiPercent,
                            computedAt: now,
                        })
                    );
                }
            }
        }

        const distinctCardIds = new Set(inventoryItems.map((inv) => inv.cardId));
        const totalCards = distinctCardIds.size;
        let totalQuantity = 0;
        for (const inv of inventoryItems) {
            totalQuantity += inv.quantity;
        }

        return {
            userId,
            totalValue,
            totalCost,
            totalRealizedGain,
            totalCards,
            totalQuantity,
            computedAt: now,
            performances,
        };
    }
}

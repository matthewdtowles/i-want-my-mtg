import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { Transaction } from 'src/core/transaction/transaction.entity';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { getLogger } from 'src/logger/global-app-logger';
import { PortfolioCardPerformance } from './portfolio-card-performance.entity';
import {
    PortfolioCardPerformanceRepositoryPort,
    SetRoiAggregation,
} from './portfolio-card-performance.repository.port';
import { PortfolioSummary } from './portfolio-summary.entity';
import { PortfolioSummaryRepositoryPort } from './portfolio-summary.repository.port';

@Injectable()
export class PortfolioSummaryService {
    private readonly LOGGER = getLogger(PortfolioSummaryService.name);
    private readonly maxDailyRefreshes: number;
    private readonly cooldownMinutes: number;

    constructor(
        @Inject(PortfolioSummaryRepositoryPort)
        private readonly summaryRepository: PortfolioSummaryRepositoryPort,
        @Inject(PortfolioCardPerformanceRepositoryPort)
        private readonly performanceRepository: PortfolioCardPerformanceRepositoryPort,
        @Inject(InventoryService)
        private readonly inventoryService: InventoryService,
        @Inject(TransactionService)
        private readonly transactionService: TransactionService,
        private readonly configService: ConfigService
    ) {
        const parsedMaxDaily = parseInt(
            this.configService.get<string>('PORTFOLIO_REFRESH_MAX_DAILY', '3'),
            10
        );
        this.maxDailyRefreshes = Number.isFinite(parsedMaxDaily) ? parsedMaxDaily : 3;

        const parsedCooldown = parseInt(
            this.configService.get<string>('PORTFOLIO_REFRESH_COOLDOWN_MINUTES', '60'),
            10
        );
        this.cooldownMinutes = Number.isFinite(parsedCooldown) ? parsedCooldown : 60;
    }

    async getSummary(userId: number): Promise<PortfolioSummary | null> {
        this.LOGGER.debug(`Get portfolio summary for user ${userId}.`);
        return this.summaryRepository.findByUser(userId);
    }

    async getCardPerformance(
        userId: number,
        sortBy: string,
        limit: number
    ): Promise<PortfolioCardPerformance[]> {
        this.LOGGER.debug(
            `Get card performance for user ${userId}, sortBy: ${sortBy}, limit: ${limit}.`
        );
        return this.performanceRepository.findByUser(userId, sortBy, limit);
    }

    async getSetRoi(userId: number): Promise<SetRoiAggregation[]> {
        this.LOGGER.debug(`Get set-level ROI for user ${userId}.`);
        return this.performanceRepository.aggregateBySet(userId);
    }

    async refreshSummary(userId: number): Promise<PortfolioSummary> {
        this.LOGGER.debug(`Refresh portfolio summary for user ${userId}.`);

        const manager = this.summaryRepository.getManager();
        return manager.transaction(async (txManager: EntityManager) => {
            const existing = await this.summaryRepository.findByUserForUpdate(userId, txManager);
            if (existing) {
                this.assertCanRefresh(existing);
            }

            const summary = await this.computeSummary(userId, txManager);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const isNewDay = !existing || existing.lastRefreshDate.getTime() < today.getTime();
            const refreshesToday = isNewDay ? 1 : (existing?.refreshesToday ?? 0) + 1;

            const summaryToSave = new PortfolioSummary({
                ...summary,
                refreshesToday,
                lastRefreshDate: new Date(),
                computationMethod: 'fifo',
            });

            return this.summaryRepository.save(summaryToSave, txManager);
        });
    }

    async computeSummary(
        userId: number,
        manager?: EntityManager
    ): Promise<{
        userId: number;
        totalValue: number;
        totalCost: number | null;
        totalRealizedGain: number | null;
        totalCards: number;
        totalQuantity: number;
        computedAt: Date;
    }> {
        this.LOGGER.debug(`Computing portfolio summary for user ${userId}.`);

        const allOptions = new SafeQueryOptions({ page: '1', limit: '100000' });
        const inventoryItems = await this.inventoryService.findAllForUser(userId, allOptions);
        const totalValue = await this.inventoryService.totalOwnedValue(userId);

        const transactions = await this.transactionService.findByUser(userId);
        const hasTransactions = transactions.length > 0;

        let totalCost: number | null = null;
        let totalRealizedGain: number | null = null;
        const performances: PortfolioCardPerformance[] = [];
        const now = new Date();

        if (hasTransactions) {
            totalCost = 0;
            totalRealizedGain = 0;

            // Prebuild maps for O(1) lookups
            const inventoryMap = new Map<string, (typeof inventoryItems)[0]>();
            const cardFoilKeys = new Set<string>();
            for (const inv of inventoryItems) {
                const key = `${inv.cardId}:${inv.isFoil}`;
                inventoryMap.set(key, inv);
                cardFoilKeys.add(key);
            }
            const transactionCardKeys = new Set<string>();

            // Group transactions by cardId:isFoil for in-memory FIFO
            const buyLotsMap = new Map<string, Transaction[]>();
            const sellsMap = new Map<string, Transaction[]>();
            for (const tx of transactions) {
                const key = `${tx.cardId}:${tx.isFoil}`;
                transactionCardKeys.add(key);
                cardFoilKeys.add(key);

                if (tx.type === 'BUY') {
                    if (!buyLotsMap.has(key)) buyLotsMap.set(key, []);
                    buyLotsMap.get(key).push(tx);
                } else {
                    if (!sellsMap.has(key)) sellsMap.set(key, []);
                    sellsMap.get(key).push(tx);
                }
            }

            // Sort buy lots and sells by date ASC for FIFO
            for (const lots of buyLotsMap.values()) {
                lots.sort((a, b) => a.date.getTime() - b.date.getTime());
            }
            for (const sells of sellsMap.values()) {
                sells.sort((a, b) => a.date.getTime() - b.date.getTime());
            }

            for (const key of cardFoilKeys) {
                const [cardId, foilStr] = key.split(':');
                const isFoil = foilStr === 'true';

                const inventoryItem = inventoryMap.get(key);
                const quantity = inventoryItem?.quantity ?? 0;

                // Get market price for current value
                let marketPrice = 0;
                if (inventoryItem?.card?.prices?.[0]) {
                    const price = inventoryItem.card.prices[0];
                    marketPrice = isFoil ? (price.foil ?? 0) : (price.normal ?? price.foil ?? 0);
                }

                const currentValue = quantity * marketPrice;

                // Compute FIFO in-memory from grouped transactions
                const fifo = PortfolioSummaryService.computeFifoFromTransactions(
                    buyLotsMap.get(key) || [],
                    sellsMap.get(key) || []
                );

                const lotTotalCost = fifo.lots.reduce(
                    (sum, lot) => sum + lot.remaining * lot.costPerUnit,
                    0
                );
                const lotQuantity = fifo.lots.reduce((sum, lot) => sum + lot.remaining, 0);
                const averageCost = lotQuantity > 0 ? lotTotalCost / lotQuantity : 0;
                const unrealizedGain = quantity * (marketPrice - averageCost);

                totalCost += lotTotalCost;
                totalRealizedGain += fifo.totalRealizedGain;

                const cardTotalCost = lotTotalCost;
                const roiPercent =
                    cardTotalCost > 0
                        ? ((currentValue - cardTotalCost) / cardTotalCost) * 100
                        : null;

                // Only include cards that have transaction data
                if (transactionCardKeys.has(key)) {
                    performances.push(
                        new PortfolioCardPerformance({
                            userId,
                            cardId,
                            isFoil,
                            quantity,
                            totalCost: lotTotalCost,
                            averageCost,
                            currentValue,
                            unrealizedGain,
                            realizedGain: fifo.totalRealizedGain,
                            roiPercent,
                            computedAt: now,
                        })
                    );
                }
            }
        }

        // Save per-card performance data
        await this.performanceRepository.replaceForUser(userId, performances, manager);

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
        };
    }

    /**
     * Compute FIFO lot allocations from pre-sorted buy/sell arrays (no DB queries).
     * Buy lots and sells must be sorted by date ASC.
     */
    static computeFifoFromTransactions(
        buyLots: Transaction[],
        sells: Transaction[]
    ): {
        lots: Array<{ lotId: number; remaining: number; costPerUnit: number }>;
        totalSoldCost: number;
        totalRealizedGain: number;
    } {
        let totalSoldCost = 0;
        let totalRealizedGain = 0;

        const lotRemaining = buyLots.map((lot) => ({
            lotId: lot.id,
            remaining: lot.quantity,
            costPerUnit: lot.pricePerUnit,
        }));

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

    private assertCanRefresh(existing: PortfolioSummary): void {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const isNewDay = existing.lastRefreshDate.getTime() < today.getTime();

        if (!isNewDay) {
            // Check daily limit
            if (existing.refreshesToday >= this.maxDailyRefreshes) {
                throw new Error(
                    `Daily refresh limit reached (${this.maxDailyRefreshes}). Try again tomorrow.`
                );
            }

            // Check cooldown
            const elapsed = Date.now() - existing.computedAt.getTime();
            const cooldownMs = this.cooldownMinutes * 60 * 1000;
            if (elapsed < cooldownMs) {
                const remainingMinutes = Math.ceil((cooldownMs - elapsed) / 60000);
                throw new Error(
                    `Please wait ${remainingMinutes} minute(s) before refreshing again.`
                );
            }
        }
    }
}

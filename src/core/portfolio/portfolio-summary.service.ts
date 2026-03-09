import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import { InventoryService } from 'src/core/inventory/inventory.service';
import { SafeQueryOptions } from 'src/core/query/safe-query-options.dto';
import { TransactionService } from 'src/core/transaction/transaction.service';
import { getLogger } from 'src/logger/global-app-logger';
import { PortfolioCardPerformance } from './portfolio-card-performance.entity';
import {
    PortfolioCardPerformanceRepositoryPort,
    SetRoiAggregation,
} from './ports/portfolio-card-performance.repository.port';
import { PortfolioComputationService } from './portfolio-computation.service';
import { PortfolioSummary } from './portfolio-summary.entity';
import { PortfolioSummaryRepositoryPort } from './ports/portfolio-summary.repository.port';

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
        @Inject(PortfolioComputationService)
        private readonly computationService: PortfolioComputationService,
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
        const [inventoryItems, totalValue, transactions] = await Promise.all([
            this.inventoryService.findAllForUser(userId, allOptions),
            this.inventoryService.totalOwnedValue(userId),
            this.transactionService.findByUser(userId),
        ]);

        const computed = this.computationService.compute(
            userId,
            inventoryItems,
            transactions,
            totalValue
        );

        await this.performanceRepository.replaceForUser(userId, computed.performances, manager);

        return {
            userId: computed.userId,
            totalValue: computed.totalValue,
            totalCost: computed.totalCost,
            totalRealizedGain: computed.totalRealizedGain,
            totalCards: computed.totalCards,
            totalQuantity: computed.totalQuantity,
            computedAt: computed.computedAt,
        };
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

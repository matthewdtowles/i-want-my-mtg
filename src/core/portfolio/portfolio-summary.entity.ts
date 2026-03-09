import { validateInit } from 'src/core/validation.util';

export type ComputationMethod = 'average' | 'fifo';

export class PortfolioSummary {
    readonly userId: number;
    readonly totalValue: number;
    readonly totalCost: number | null;
    readonly totalRealizedGain: number | null;
    readonly totalCards: number;
    readonly totalQuantity: number;
    readonly computedAt: Date;
    readonly refreshesToday: number;
    readonly lastRefreshDate: Date;
    readonly computationMethod: ComputationMethod;

    constructor(init: Partial<PortfolioSummary>) {
        validateInit(init, ['userId', 'totalValue', 'totalCards', 'totalQuantity', 'computedAt']);
        this.userId = init.userId;
        this.totalValue = init.totalValue;
        this.totalCost = init.totalCost ?? null;
        this.totalRealizedGain = init.totalRealizedGain ?? null;
        this.totalCards = init.totalCards;
        this.totalQuantity = init.totalQuantity;
        this.computedAt = init.computedAt;
        this.refreshesToday = init.refreshesToday ?? 0;
        this.lastRefreshDate = init.lastRefreshDate ?? new Date();
        this.computationMethod = init.computationMethod ?? 'average';
    }
}

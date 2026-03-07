import { validateInit } from 'src/core/validation.util';

export class PortfolioCardPerformance {
    readonly id?: number;
    readonly userId: number;
    readonly cardId: string;
    readonly isFoil: boolean;
    readonly quantity: number;
    readonly totalCost: number;
    readonly averageCost: number;
    readonly currentValue: number;
    readonly unrealizedGain: number;
    readonly realizedGain: number;
    readonly roiPercent: number | null;
    readonly computedAt: Date;

    constructor(init: Partial<PortfolioCardPerformance>) {
        validateInit(init, [
            'userId',
            'cardId',
            'quantity',
            'totalCost',
            'averageCost',
            'currentValue',
            'unrealizedGain',
            'realizedGain',
            'computedAt',
        ]);
        this.id = init.id;
        this.userId = init.userId;
        this.cardId = init.cardId;
        this.isFoil = init.isFoil ?? false;
        this.quantity = init.quantity;
        this.totalCost = init.totalCost;
        this.averageCost = init.averageCost;
        this.currentValue = init.currentValue;
        this.unrealizedGain = init.unrealizedGain;
        this.realizedGain = init.realizedGain;
        this.roiPercent = init.roiPercent ?? null;
        this.computedAt = init.computedAt;
    }
}

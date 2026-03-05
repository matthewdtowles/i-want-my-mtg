import { validateInit } from 'src/core/validation.util';

export class PortfolioValueHistory {
    readonly id?: number;
    readonly userId: number;
    readonly totalValue: number;
    readonly totalCost: number | null;
    readonly totalCards: number;
    readonly date: Date;

    constructor(init: Partial<PortfolioValueHistory>) {
        validateInit(init, ['userId', 'totalValue', 'totalCards', 'date']);
        this.id = init.id;
        this.userId = init.userId;
        this.totalValue = init.totalValue;
        this.totalCost = init.totalCost ?? null;
        this.totalCards = init.totalCards;
        this.date = init.date;
    }
}

export class SetPrice {
    readonly setCode: string;
    readonly basePrice: number;
    readonly totalPrice: number;
    readonly basePriceAll: number;
    readonly totalPriceAll: number;
    readonly lastUpdate: Date;

    constructor(init: Partial<SetPrice>) {
        this.setCode = init.setCode;
        this.basePrice = init.basePrice ?? null;
        this.totalPrice = init.totalPrice ?? null;
        this.basePriceAll = init.basePriceAll ?? null;
        this.totalPriceAll = init.totalPriceAll ?? null;
        this.lastUpdate = init.lastUpdate ?? new Date();
    }
}
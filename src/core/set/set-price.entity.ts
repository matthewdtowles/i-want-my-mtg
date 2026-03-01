export class SetPrice {
    readonly setCode: string;
    readonly basePrice: number | null;
    readonly totalPrice: number | null;
    readonly basePriceAll: number | null;
    readonly totalPriceAll: number | null;
    readonly basePriceChangeWeekly: number | null;
    readonly totalPriceChangeWeekly: number | null;
    readonly basePriceAllChangeWeekly: number | null;
    readonly totalPriceAllChangeWeekly: number | null;
    readonly lastUpdate: Date;

    constructor(init: Partial<SetPrice>) {
        this.setCode = init.setCode;
        this.basePrice = init.basePrice ?? null;
        this.totalPrice = init.totalPrice ?? null;
        this.basePriceAll = init.basePriceAll ?? null;
        this.totalPriceAll = init.totalPriceAll ?? null;
        this.basePriceChangeWeekly = init.basePriceChangeWeekly ?? null;
        this.totalPriceChangeWeekly = init.totalPriceChangeWeekly ?? null;
        this.basePriceAllChangeWeekly = init.basePriceAllChangeWeekly ?? null;
        this.totalPriceAllChangeWeekly = init.totalPriceAllChangeWeekly ?? null;
        this.lastUpdate = init.lastUpdate ?? new Date();
    }
}

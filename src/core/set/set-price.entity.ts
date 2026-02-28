export class SetPrice {
    readonly setCode: string;
    readonly basePrice: number | null;
    readonly totalPrice: number | null;
    readonly basePriceAll: number | null;
    readonly totalPriceAll: number | null;
    readonly basePriceChange7d: number | null;
    readonly totalPriceChange7d: number | null;
    readonly basePriceAllChange7d: number | null;
    readonly totalPriceAllChange7d: number | null;
    readonly lastUpdate: Date;

    constructor(init: Partial<SetPrice>) {
        this.setCode = init.setCode;
        this.basePrice = init.basePrice ?? null;
        this.totalPrice = init.totalPrice ?? null;
        this.basePriceAll = init.basePriceAll ?? null;
        this.totalPriceAll = init.totalPriceAll ?? null;
        this.basePriceChange7d = init.basePriceChange7d ?? null;
        this.totalPriceChange7d = init.totalPriceChange7d ?? null;
        this.basePriceAllChange7d = init.basePriceAllChange7d ?? null;
        this.totalPriceAllChange7d = init.totalPriceAllChange7d ?? null;
        this.lastUpdate = init.lastUpdate ?? new Date();
    }
}

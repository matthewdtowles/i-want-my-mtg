export class SetPriceHistory {
    readonly id?: number;
    readonly setCode: string;
    readonly basePrice: number | null;
    readonly totalPrice: number | null;
    readonly basePriceAll: number | null;
    readonly totalPriceAll: number | null;
    readonly date: Date;

    constructor(init: Partial<SetPriceHistory>) {
        this.id = init.id;
        this.setCode = init.setCode;
        this.basePrice = init.basePrice ?? null;
        this.totalPrice = init.totalPrice ?? null;
        this.basePriceAll = init.basePriceAll ?? null;
        this.totalPriceAll = init.totalPriceAll ?? null;
        this.date = init.date ?? new Date();
    }
}

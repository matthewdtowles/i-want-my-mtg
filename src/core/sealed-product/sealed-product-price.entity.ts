import { validateInit } from 'src/core/validation.util';

export class SealedProductPrice {
    readonly price: number | null;
    readonly priceChangeWeekly: number | null;
    readonly date: string;

    constructor(init: Partial<SealedProductPrice>) {
        validateInit(init, ['date']);
        this.price = init.price ?? null;
        this.priceChangeWeekly = init.priceChangeWeekly ?? null;
        this.date = init.date;
    }
}

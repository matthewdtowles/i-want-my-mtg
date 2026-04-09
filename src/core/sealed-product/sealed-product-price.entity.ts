import { validateInit } from 'src/core/validation.util';

export class SealedProductPrice {
    readonly price?: number;
    readonly priceChangeWeekly?: number;
    readonly date: string;

    constructor(init: Partial<SealedProductPrice>) {
        validateInit(init, ['date']);
        this.price = init.price;
        this.priceChangeWeekly = init.priceChangeWeekly;
        this.date = init.date;
    }
}

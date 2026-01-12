export class SetPriceDto {
    readonly basePriceNormal: string;      // Base set, normal cards only
    readonly basePriceAll: string;         // Base set, with foils
    readonly totalPriceNormal: string;     // All cards, normal only
    readonly totalPriceAll: string;        // All cards, with foils

    constructor(init: Partial<SetPriceDto>) {
        this.basePriceNormal = init.basePriceNormal ?? '-';
        this.basePriceAll = init.basePriceAll ?? '-';
        this.totalPriceNormal = init.totalPriceNormal ?? '-';
        this.totalPriceAll = init.totalPriceAll ?? '-';
    }
}
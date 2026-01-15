export class SetPriceDto {
    readonly basePriceNormal?: string | null;
    readonly basePriceAll?: string | null;
    readonly totalPriceNormal?: string | null;
    readonly totalPriceAll?: string | null;
    readonly lastUpdate: Date;

    constructor(init: Partial<SetPriceDto>) {
        this.basePriceNormal = init.basePriceNormal;
        this.basePriceAll = init.basePriceAll;
        this.totalPriceNormal = init.totalPriceNormal;
        this.totalPriceAll = init.totalPriceAll;
        this.lastUpdate = init.lastUpdate ?? new Date();
    }
}
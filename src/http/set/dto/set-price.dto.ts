export class SetPriceDto {
    readonly gridCols: number;
    readonly defaultPrice: string;
    readonly basePriceNormal?: string | null;
    readonly basePriceAll?: string | null;
    readonly totalPriceNormal?: string | null;
    readonly totalPriceAll?: string | null;
    readonly lastUpdate: Date;

    constructor(init: Partial<SetPriceDto>) {
        this.gridCols = init.gridCols ?? 1;
        this.defaultPrice = init.defaultPrice ?? '-';
        this.basePriceNormal = init.basePriceNormal;
        this.basePriceAll = init.basePriceAll;
        this.totalPriceNormal = init.totalPriceNormal;
        this.totalPriceAll = init.totalPriceAll;
        this.lastUpdate = init.lastUpdate;
    }
}

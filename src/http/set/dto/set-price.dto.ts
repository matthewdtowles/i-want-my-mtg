export class SetPriceDto {
    readonly gridCols: number;
    readonly defaultPrice: string;
    readonly basePriceNormal?: string | null;
    readonly basePriceAll?: string | null;
    readonly totalPriceNormal?: string | null;
    readonly totalPriceAll?: string | null;
    readonly defaultPriceChange7d?: string;
    readonly defaultPriceChange7dSign?: string;
    readonly lastUpdate: Date;

    constructor(init: Partial<SetPriceDto>) {
        this.gridCols = init.gridCols ?? 1;
        this.defaultPrice = init.defaultPrice ?? '-';
        this.basePriceNormal = init.basePriceNormal;
        this.basePriceAll = init.basePriceAll;
        this.totalPriceNormal = init.totalPriceNormal;
        this.totalPriceAll = init.totalPriceAll;
        this.defaultPriceChange7d = init.defaultPriceChange7d || '';
        this.defaultPriceChange7dSign = init.defaultPriceChange7dSign || '';
        this.lastUpdate = init.lastUpdate;
    }
}

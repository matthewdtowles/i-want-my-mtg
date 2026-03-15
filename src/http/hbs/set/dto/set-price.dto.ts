export class SetPriceDto {
    readonly gridCols: number;
    readonly defaultPrice: string;
    readonly basePriceNormal?: string | null;
    readonly basePriceAll?: string | null;
    readonly totalPriceNormal?: string | null;
    readonly totalPriceAll?: string | null;
    readonly defaultPriceChangeWeekly?: string;
    readonly defaultPriceChangeWeeklySign?: string;
    readonly basePriceNormalChangeWeekly?: string;
    readonly basePriceNormalChangeWeeklySign?: string;
    readonly basePriceAllChangeWeekly?: string;
    readonly basePriceAllChangeWeeklySign?: string;
    readonly totalPriceNormalChangeWeekly?: string;
    readonly totalPriceNormalChangeWeeklySign?: string;
    readonly totalPriceAllChangeWeekly?: string;
    readonly totalPriceAllChangeWeeklySign?: string;
    readonly lastUpdate: Date;

    constructor(init: Partial<SetPriceDto>) {
        this.gridCols = init.gridCols ?? 1;
        this.defaultPrice = init.defaultPrice ?? '-';
        this.basePriceNormal = init.basePriceNormal;
        this.basePriceAll = init.basePriceAll;
        this.totalPriceNormal = init.totalPriceNormal;
        this.totalPriceAll = init.totalPriceAll;
        this.defaultPriceChangeWeekly = init.defaultPriceChangeWeekly || '';
        this.defaultPriceChangeWeeklySign = init.defaultPriceChangeWeeklySign || '';
        this.basePriceNormalChangeWeekly = init.basePriceNormalChangeWeekly || '';
        this.basePriceNormalChangeWeeklySign = init.basePriceNormalChangeWeeklySign || '';
        this.basePriceAllChangeWeekly = init.basePriceAllChangeWeekly || '';
        this.basePriceAllChangeWeeklySign = init.basePriceAllChangeWeeklySign || '';
        this.totalPriceNormalChangeWeekly = init.totalPriceNormalChangeWeekly || '';
        this.totalPriceNormalChangeWeeklySign = init.totalPriceNormalChangeWeeklySign || '';
        this.totalPriceAllChangeWeekly = init.totalPriceAllChangeWeekly || '';
        this.totalPriceAllChangeWeeklySign = init.totalPriceAllChangeWeeklySign || '';
        this.lastUpdate = init.lastUpdate;
    }
}

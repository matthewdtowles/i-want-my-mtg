// For setListPage.hbs
export class SetMetaDto {
    readonly block?: string;
    readonly code: string;
    readonly keyruneCode: string;
    readonly name: string;
    readonly ownedPercentage: number;
    readonly ownedValue: string;
    readonly releaseDate: string;
    readonly totalValue: string;
    readonly url: string;

    constructor(init: Partial<SetMetaDto>) {
        this.block = init.block || "";
        this.code = init.code || "";
        this.keyruneCode = init.keyruneCode || "";
        this.name = init.name || "";
        this.ownedPercentage = init.ownedPercentage || 0;
        this.ownedValue = init.ownedValue || "0.00";
        this.releaseDate = init.releaseDate || "";
        this.totalValue = init.totalValue || "0.00";
        this.url = init.url || "";
    }
}
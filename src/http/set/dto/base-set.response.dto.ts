export class BaseSetResponseDto {
    readonly block?: string;
    readonly code: string;
    readonly completionRate: number;
    readonly keyruneCode: string;
    readonly name: string;
    readonly ownedValue: string;
    readonly releaseDate: string;
    // TODO after set meta reponse dto is ready:
    // readonly ownedTotal: number
    // readonly setSize: number
    // readonly baseSetSize: number
    readonly totalValue: string;
    readonly url: string;

    constructor(init: Partial<BaseSetResponseDto>) {
        this.block = init.block || init.name || "";
        this.code = init.code || "";
        this.keyruneCode = init.keyruneCode || "";
        this.name = init.name || "";
        this.completionRate = init.completionRate || 0;
        this.ownedValue = init.ownedValue || "0.00";
        this.releaseDate = init.releaseDate || "";
        this.totalValue = init.totalValue || "0.00";
        this.url = init.url || "";
    }
}
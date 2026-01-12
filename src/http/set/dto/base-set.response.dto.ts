export class BaseSetResponseDto {
    readonly block?: string;
    readonly code: string;
    readonly completionRate: number;
    readonly keyruneCode: string;
    readonly name: string;
    readonly ownedTotal: number
    readonly ownedValue: string;
    readonly releaseDate: string;
    readonly url: string;

    constructor(init: Partial<BaseSetResponseDto>) {
        this.block = init.block || init.name || "";
        this.code = init.code || "";
        this.completionRate = init.completionRate ?? 0;
        this.keyruneCode = init.keyruneCode || "";
        this.name = init.name || "";
        this.ownedTotal = init.ownedTotal ?? 0;
        this.ownedValue = init.ownedValue || "0.00";
        this.releaseDate = init.releaseDate || "";
        this.url = init.url || "";
    }
}
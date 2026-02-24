import { SetPriceDto } from './set-price.dto';

export class BaseSetResponseDto {
    readonly baseSize: number;
    readonly block?: string;
    readonly code: string;
    readonly completionRate: number;
    readonly effectiveSize: number;
    readonly isMain: boolean;
    readonly keyruneCode: string;
    readonly name: string;
    readonly ownedTotal: number;
    readonly parentCode?: string;
    readonly ownedValue: string;
    readonly prices?: SetPriceDto;
    readonly releaseDate: string;
    readonly totalSize: number;
    readonly url: string;
    readonly tags: string[];

    constructor(init: Partial<BaseSetResponseDto>) {
        this.baseSize = init.baseSize ?? 0;
        this.block = init.block || init.name || '';
        this.code = init.code || '';
        this.completionRate = init.completionRate ?? 0;
        this.isMain = init.isMain ?? true;
        this.keyruneCode = init.keyruneCode || '';
        this.name = init.name || '';
        this.ownedTotal = init.ownedTotal ?? 0;
        this.parentCode = init.parentCode;
        this.ownedValue = init.ownedValue || '0.00';
        this.prices = init.prices ?? new SetPriceDto({});
        this.releaseDate = init.releaseDate || '';
        this.totalSize = init.totalSize ?? 0;
        this.url = init.url || '';
        this.tags = init.tags || [];

        // Use totalSize when baseSize is 0 (bonus-only sets)
        this.effectiveSize = this.baseSize > 0 ? this.baseSize : this.totalSize;
    }
}

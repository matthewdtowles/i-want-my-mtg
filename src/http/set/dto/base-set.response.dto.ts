import { SetPriceDto } from './set-price.dto';

export class BaseSetResponseDto {
    readonly baseSize: number;
    readonly block?: string;
    readonly code: string;
    readonly completionRate: number;
    readonly keyruneCode: string;
    readonly name: string;
    readonly ownedTotal: number;
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
        this.keyruneCode = init.keyruneCode || '';
        this.name = init.name || '';
        this.ownedTotal = init.ownedTotal ?? 0;
        this.ownedValue = init.ownedValue || '0.00';
        this.prices = init.prices ?? new SetPriceDto({});
        this.releaseDate = init.releaseDate || '';
        this.totalSize = init.totalSize ?? 0;
        this.url = init.url || '';
        this.tags = init.tags || [];
    }
}

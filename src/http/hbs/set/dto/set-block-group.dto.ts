import { SetMetaResponseDto } from './set-meta.response.dto';

export class SetBlockGroup {
    readonly blockName: string;
    readonly sets: SetMetaResponseDto[];
    readonly isMultiSet: boolean;
    readonly releaseDate: string;
    readonly defaultPrice: string;

    constructor(init: Partial<SetBlockGroup>) {
        this.blockName = init.blockName || '';
        this.sets = init.sets || [];
        this.isMultiSet = init.isMultiSet ?? false;
        this.releaseDate = init.releaseDate || '';
        this.defaultPrice = init.defaultPrice || '0';
    }
}

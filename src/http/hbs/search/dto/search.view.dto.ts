import { BaseViewDto } from 'src/http/base/base.view.dto';
import { PaginationView } from 'src/http/hbs/list/pagination.view';

export class SearchCardResultDto {
    readonly name: string;
    readonly number: string;
    readonly imgSrc: string;
    readonly setCode: string;
    readonly keyruneCode: string;
    readonly rarity: string;
    readonly url: string;

    constructor(init: Partial<SearchCardResultDto>) {
        this.name = init.name || '';
        this.number = init.number || '';
        this.imgSrc = init.imgSrc || '';
        this.setCode = init.setCode || '';
        this.keyruneCode = init.keyruneCode || '';
        this.rarity = init.rarity || '';
        this.url = init.url || '';
    }
}

export class SearchSetResultDto {
    readonly code: string;
    readonly name: string;
    readonly keyruneCode: string;
    readonly releaseDate: string;
    readonly url: string;
    readonly tags: string[];

    constructor(init: Partial<SearchSetResultDto>) {
        this.code = init.code || '';
        this.name = init.name || '';
        this.keyruneCode = init.keyruneCode || '';
        this.releaseDate = init.releaseDate || '';
        this.url = init.url || '';
        this.tags = init.tags || [];
    }
}

export class SearchViewDto extends BaseViewDto {
    readonly query: string;
    readonly cards: SearchCardResultDto[];
    readonly sets: SearchSetResultDto[];
    readonly cardTotal: number;
    readonly setTotal: number;
    readonly cardPagination?: PaginationView;
    readonly setPagination?: PaginationView;

    constructor(init: Partial<SearchViewDto>) {
        super(init);
        this.query = init.query || '';
        this.cards = init.cards || [];
        this.sets = init.sets || [];
        this.cardTotal = init.cardTotal || 0;
        this.setTotal = init.setTotal || 0;
        this.cardPagination = init.cardPagination;
        this.setPagination = init.setPagination;
    }
}

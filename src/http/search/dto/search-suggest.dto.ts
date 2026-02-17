export class SuggestCardDto {
    readonly name: string;
    readonly setCode: string;
    readonly number: string;
    readonly keyruneCode: string;
    readonly rarity: string;
    readonly url: string;

    constructor(init: Partial<SuggestCardDto>) {
        this.name = init.name || '';
        this.setCode = init.setCode || '';
        this.number = init.number || '';
        this.keyruneCode = init.keyruneCode || '';
        this.rarity = init.rarity || '';
        this.url = init.url || '';
    }
}

export class SuggestSetDto {
    readonly code: string;
    readonly name: string;
    readonly keyruneCode: string;
    readonly url: string;

    constructor(init: Partial<SuggestSetDto>) {
        this.code = init.code || '';
        this.name = init.name || '';
        this.keyruneCode = init.keyruneCode || '';
        this.url = init.url || '';
    }
}

export class SearchSuggestResponseDto {
    readonly cards: SuggestCardDto[];
    readonly sets: SuggestSetDto[];
    readonly query: string;

    constructor(init: Partial<SearchSuggestResponseDto>) {
        this.cards = init.cards || [];
        this.sets = init.sets || [];
        this.query = init.query || '';
    }
}

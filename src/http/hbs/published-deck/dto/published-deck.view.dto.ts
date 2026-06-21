import { BaseViewDto } from 'src/http/base/base.view.dto';

export interface PublishedFormatOptionView {
    value: string;
    label: string;
    selected: boolean;
}

export interface PublishedDeckListItemView {
    id: number;
    title: string;
    formatLabel: string;
    tournamentName: string;
    date: string;
    result: string;
    cardCount: number;
    estimatedValue: string;
    url: string;
}

export class PublishedDeckListViewDto extends BaseViewDto {
    readonly decks: PublishedDeckListItemView[];
    readonly hasDecks: boolean;
    readonly formats: PublishedFormatOptionView[];
    readonly page: number;
    readonly hasPrev: boolean;
    readonly hasNext: boolean;
    readonly prevUrl: string;
    readonly nextUrl: string;

    constructor(init: Partial<PublishedDeckListViewDto>) {
        super(init);
        this.decks = init.decks ?? [];
        this.hasDecks = init.hasDecks ?? false;
        this.formats = init.formats ?? [];
        this.page = init.page ?? 1;
        this.hasPrev = init.hasPrev ?? false;
        this.hasNext = init.hasNext ?? false;
        this.prevUrl = init.prevUrl ?? '';
        this.nextUrl = init.nextUrl ?? '';
    }
}

export interface PublishedDeckCardView {
    name: string;
    url: string;
    imgSrc: string;
    manaCost?: string;
    quantity: number;
    lineValue: string;
    owned: number;
    missing: number;
    isBasic: boolean;
}

export interface PublishedDeckGroupView {
    type: string;
    count: number;
    cards: PublishedDeckCardView[];
}

export class PublishedDeckDetailViewDto extends BaseViewDto {
    readonly deckId: number;
    readonly deckTitle: string;
    readonly tournamentName: string;
    readonly date: string;
    readonly formatLabel: string;
    readonly player: string;
    readonly result: string;
    readonly sourceUri: string;
    readonly mainGroups: PublishedDeckGroupView[];
    readonly sideboard: PublishedDeckCardView[];
    readonly mainCount: number;
    readonly sideCount: number;
    readonly estimatedValue: string;
    readonly hasCards: boolean;
    // Gap vs. the signed-in user's collection (omitted/zero for anonymous).
    readonly showGap: boolean;
    readonly completeness: number;
    readonly neededCount: number;
    readonly ownedCount: number;
    readonly missingCount: number;
    readonly hasMissing: boolean;

    constructor(init: Partial<PublishedDeckDetailViewDto>) {
        super(init);
        this.deckId = init.deckId ?? 0;
        this.deckTitle = init.deckTitle ?? '';
        this.tournamentName = init.tournamentName ?? '';
        this.date = init.date ?? '';
        this.formatLabel = init.formatLabel ?? '';
        this.player = init.player ?? '';
        this.result = init.result ?? '';
        this.sourceUri = init.sourceUri ?? '';
        this.mainGroups = init.mainGroups ?? [];
        this.sideboard = init.sideboard ?? [];
        this.mainCount = init.mainCount ?? 0;
        this.sideCount = init.sideCount ?? 0;
        this.estimatedValue = init.estimatedValue ?? '$0.00';
        this.hasCards = init.hasCards ?? false;
        this.showGap = init.showGap ?? false;
        this.completeness = init.completeness ?? 0;
        this.neededCount = init.neededCount ?? 0;
        this.ownedCount = init.ownedCount ?? 0;
        this.missingCount = init.missingCount ?? 0;
        this.hasMissing = init.hasMissing ?? false;
    }
}

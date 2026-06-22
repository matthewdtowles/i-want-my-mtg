import { BaseViewDto } from 'src/http/base/base.view.dto';
import { ManaToken } from 'src/http/hbs/card/dto/card.response.dto';
import { DeckColorPip } from 'src/http/hbs/deck/deck-mana';

export interface PublishedFormatOptionView {
    value: string;
    label: string;
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
    colors: DeckColorPip[];
}

/** One format's horizontally-scrolling row of decks (newest first). */
export interface PublishedDeckRowView {
    format: string;
    label: string;
    decks: PublishedDeckListItemView[];
    nextOffset: number;
    hasMore: boolean;
}

/** Payload for the AJAX endpoint that lazy-loads older decks in a row. */
export interface PublishedDeckRowPage {
    items: PublishedDeckListItemView[];
    nextOffset: number;
    hasMore: boolean;
}

export class PublishedDeckListViewDto extends BaseViewDto {
    // One row per primary format that has decks (standard, pioneer, modern,
    // legacy, commander), each newest-first with AJAX side-scroll for older decks.
    readonly rows: PublishedDeckRowView[];
    readonly hasDecks: boolean;
    // Remaining formats present in the catalog, revealed by "View all formats".
    readonly otherFormats: PublishedFormatOptionView[];
    readonly hasOtherFormats: boolean;

    constructor(init: Partial<PublishedDeckListViewDto>) {
        super(init);
        this.rows = init.rows ?? [];
        this.hasDecks = init.hasDecks ?? false;
        this.otherFormats = init.otherFormats ?? [];
        this.hasOtherFormats = init.hasOtherFormats ?? false;
    }
}

export interface PublishedDeckCardView {
    name: string;
    url: string;
    manaCost: ManaToken[];
    oracleText?: string;
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
    readonly deckColors: DeckColorPip[];
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
        this.deckColors = init.deckColors ?? [];
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

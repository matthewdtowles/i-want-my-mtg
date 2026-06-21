import { BaseViewDto } from 'src/http/base/base.view.dto';
import { ManaToken } from 'src/http/hbs/card/dto/card.response.dto';

export interface FormatOptionView {
    value: string;
    label: string;
    selected: boolean;
}

export interface DeckListItemView {
    id: number;
    name: string;
    formatLabel: string;
    cardCount: number;
    estimatedValue: string;
    updatedAt: string;
    url: string;
    colors: string[];
    completeness: number;
    missingCount: number;
    buildable: boolean;
}

export class DeckListViewDto extends BaseViewDto {
    readonly decks: DeckListItemView[];
    readonly hasDecks: boolean;
    readonly formatOptions: FormatOptionView[];

    constructor(init: Partial<DeckListViewDto>) {
        super(init);
        this.decks = init.decks ?? [];
        this.hasDecks = init.hasDecks ?? false;
        this.formatOptions = init.formatOptions ?? [];
    }
}

export class DeckImportViewDto extends BaseViewDto {
    readonly formatOptions: FormatOptionView[];

    constructor(init: Partial<DeckImportViewDto>) {
        super(init);
        this.formatOptions = init.formatOptions ?? [];
    }
}

export interface DeckImportErrorView {
    row: number;
    name?: string;
    error: string;
}

export class DeckImportResultViewDto extends BaseViewDto {
    readonly deckId: number;
    readonly deckName: string;
    readonly deckUrl: string;
    readonly saved: number;
    readonly errorCount: number;
    readonly errors: DeckImportErrorView[];

    constructor(init: Partial<DeckImportResultViewDto>) {
        super(init);
        this.deckId = init.deckId ?? 0;
        this.deckName = init.deckName ?? '';
        this.deckUrl = init.deckUrl ?? '/decks';
        this.saved = init.saved ?? 0;
        this.errorCount = init.errorCount ?? 0;
        this.errors = init.errors ?? [];
    }
}

export interface DeckCardView {
    cardId: string;
    name: string;
    setCode: string;
    number: string;
    url: string;
    manaCost: ManaToken[];
    oracleText?: string;
    quantity: number;
    unitValue: number;
    lineValue: string;
    isSideboard: boolean;
    illegal: boolean;
    owned: number;
    missing: number;
    isBasic: boolean;
}

export interface DeckCardGroupView {
    type: string;
    // Singular primary-type key (e.g. "Creature", "Land", "Other"); the deck-page
    // search JS matches/creates groups by this, independent of the plural label.
    groupKey: string;
    count: number;
    cards: DeckCardView[];
}

export class DeckDetailViewDto extends BaseViewDto {
    readonly deckId: number;
    readonly name: string;
    readonly format: string | null;
    readonly formatLabel: string;
    readonly formatOptions: FormatOptionView[];
    readonly mainGroups: DeckCardGroupView[];
    readonly sideboard: DeckCardView[];
    readonly deckColors: string[];
    readonly mainCount: number;
    readonly sideCount: number;
    readonly estimatedValue: string;
    readonly illegalCount: number;
    readonly hasCards: boolean;
    readonly completeness: number;
    readonly neededCount: number;
    readonly ownedCount: number;
    readonly missingCount: number;
    readonly hasMissing: boolean;

    constructor(init: Partial<DeckDetailViewDto>) {
        super(init);
        this.deckId = init.deckId ?? 0;
        this.name = init.name ?? '';
        this.format = init.format ?? null;
        this.formatLabel = init.formatLabel ?? '';
        this.formatOptions = init.formatOptions ?? [];
        this.mainGroups = init.mainGroups ?? [];
        this.sideboard = init.sideboard ?? [];
        this.deckColors = init.deckColors ?? [];
        this.mainCount = init.mainCount ?? 0;
        this.sideCount = init.sideCount ?? 0;
        this.estimatedValue = init.estimatedValue ?? '$0.00';
        this.illegalCount = init.illegalCount ?? 0;
        this.hasCards = init.hasCards ?? false;
        this.completeness = init.completeness ?? 0;
        this.neededCount = init.neededCount ?? 0;
        this.ownedCount = init.ownedCount ?? 0;
        this.missingCount = init.missingCount ?? 0;
        this.hasMissing = init.hasMissing ?? false;
    }
}

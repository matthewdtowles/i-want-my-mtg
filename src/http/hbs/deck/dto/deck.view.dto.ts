import { BaseViewDto } from 'src/http/base/base.view.dto';

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

export interface DeckCardView {
    cardId: string;
    name: string;
    setCode: string;
    number: string;
    url: string;
    manaCost?: string;
    quantity: number;
    unitValue: number;
    lineValue: string;
    isSideboard: boolean;
    illegal: boolean;
}

export interface DeckCardGroupView {
    type: string;
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
    readonly mainCount: number;
    readonly sideCount: number;
    readonly estimatedValue: string;
    readonly illegalCount: number;
    readonly hasCards: boolean;

    constructor(init: Partial<DeckDetailViewDto>) {
        super(init);
        this.deckId = init.deckId ?? 0;
        this.name = init.name ?? '';
        this.format = init.format ?? null;
        this.formatLabel = init.formatLabel ?? '';
        this.formatOptions = init.formatOptions ?? [];
        this.mainGroups = init.mainGroups ?? [];
        this.sideboard = init.sideboard ?? [];
        this.mainCount = init.mainCount ?? 0;
        this.sideCount = init.sideCount ?? 0;
        this.estimatedValue = init.estimatedValue ?? '$0.00';
        this.illegalCount = init.illegalCount ?? 0;
        this.hasCards = init.hasCards ?? false;
    }
}

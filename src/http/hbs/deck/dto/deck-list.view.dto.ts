import { Format } from 'src/core/card/format.enum';
import { BaseViewDto } from 'src/http/base/base.view.dto';

export interface DeckListItem {
    id: number;
    name: string;
    format: Format | null;
    formatLabel: string;
    cardCount: number;
    sideboardCount: number;
    updatedAt: Date;
}

export class DeckListViewDto extends BaseViewDto {
    readonly decks: DeckListItem[];
    readonly hasDecks: boolean;
    readonly formats: Array<{ value: string; label: string }>;

    constructor(init: Partial<DeckListViewDto>) {
        super(init);
        this.decks = init.decks ?? [];
        this.hasDecks = this.decks.length > 0;
        this.formats = init.formats ?? [];
    }
}

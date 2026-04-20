import { Format } from 'src/core/card/format.enum';
import { BaseViewDto } from 'src/http/base/base.view.dto';

export interface DeckDetailCard {
    cardId: string;
    quantity: number;
    isSideboard: boolean;
    name: string;
    number: string;
    setCode: string;
    cardUrl: string;
    imgSrc: string;
    type: string;
    manaCost?: string;
    typeCategory: string;
    price: number | null;
    lineTotal: number;
    isBanned: boolean;
}

export interface DeckTypeGroup {
    label: string;
    count: number;
    cards: DeckDetailCard[];
}

export interface DeckWarning {
    kind: 'size' | 'sideboard' | 'copies' | 'banned';
    message: string;
}

export class DeckDetailViewDto extends BaseViewDto {
    readonly deck: {
        id: number;
        name: string;
        format: Format | null;
        formatLabel: string;
        description: string | null;
        updatedAt: string;
    };
    readonly mainGroups: DeckTypeGroup[];
    readonly sideboard: DeckDetailCard[];
    readonly mainCount: number;
    readonly sideboardCount: number;
    readonly totalValue: number;
    readonly warnings: DeckWarning[];
    readonly formats: Array<{ value: string; label: string }>;

    constructor(init: Partial<DeckDetailViewDto>) {
        super(init);
        this.deck = init.deck!;
        this.mainGroups = init.mainGroups ?? [];
        this.sideboard = init.sideboard ?? [];
        this.mainCount = init.mainCount ?? 0;
        this.sideboardCount = init.sideboardCount ?? 0;
        this.totalValue = init.totalValue ?? 0;
        this.warnings = init.warnings ?? [];
        this.formats = init.formats ?? [];
    }
}

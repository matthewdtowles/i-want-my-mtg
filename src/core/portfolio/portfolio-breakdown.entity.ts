export type BreakdownDimension = 'set' | 'rarity' | 'type' | 'cost-basis' | 'color';

export const BREAKDOWN_DIMENSIONS: BreakdownDimension[] = [
    'set',
    'rarity',
    'type',
    'cost-basis',
    'color',
];

// Color-identity codes (MTGJSON letters) plus 'C' for colorless (empty identity).
// A card belongs to every color in its identity, so these are membership groups,
// not a partition - multicolor cards count in each of their colors.
export const COLOR_CODES = ['W', 'U', 'B', 'R', 'G', 'C'] as const;
export type ColorCode = (typeof COLOR_CODES)[number];
export const COLOR_LABELS: Record<string, string> = {
    W: 'White',
    U: 'Blue',
    B: 'Black',
    R: 'Red',
    G: 'Green',
    C: 'Colorless',
};

/**
 * A single card inside one breakdown slice (the drill-down rows). Foil and
 * non-foil inventory of the same card are collapsed into one entry: `quantity`
 * is the total owned and `value` is the combined current value across both.
 * `scryfallId` is the raw id - presenters derive the image URL from it.
 */
export class PortfolioBreakdownCard {
    readonly cardId: string;
    readonly name: string;
    readonly setCode: string;
    readonly number: string;
    readonly scryfallId: string;
    readonly rarity: string;
    readonly quantity: number;
    readonly value: number;

    constructor(init: Partial<PortfolioBreakdownCard>) {
        this.cardId = init.cardId ?? '';
        this.name = init.name ?? '';
        this.setCode = init.setCode ?? '';
        this.number = init.number ?? '';
        this.scryfallId = init.scryfallId ?? '';
        this.rarity = init.rarity ?? '';
        this.quantity = init.quantity ?? 0;
        this.value = init.value ?? 0;
    }
}

export class PortfolioBreakdownSlice {
    readonly key: string;
    readonly label: string;
    readonly cardCount: number;
    readonly itemCount: number;
    readonly value: number;

    constructor(init: Partial<PortfolioBreakdownSlice>) {
        this.key = init.key ?? '';
        this.label = init.label ?? '';
        this.cardCount = init.cardCount ?? 0;
        this.itemCount = init.itemCount ?? 0;
        this.value = init.value ?? 0;
    }
}

export class PortfolioBreakdown {
    readonly dimension: BreakdownDimension;
    readonly slices: PortfolioBreakdownSlice[];
    readonly totalValue: number;
    readonly totalItems: number;

    constructor(dimension: BreakdownDimension, slices: PortfolioBreakdownSlice[]) {
        this.dimension = dimension;
        this.slices = slices;
        this.totalValue = slices.reduce((sum, s) => sum + s.value, 0);
        this.totalItems = slices.reduce((sum, s) => sum + s.itemCount, 0);
    }
}

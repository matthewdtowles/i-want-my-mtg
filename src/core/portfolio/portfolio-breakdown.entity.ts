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

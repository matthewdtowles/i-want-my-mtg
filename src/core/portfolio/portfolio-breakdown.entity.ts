export type BreakdownDimension = 'set' | 'rarity' | 'type' | 'format' | 'cost-basis';

export const BREAKDOWN_DIMENSIONS: BreakdownDimension[] = [
    'set',
    'rarity',
    'type',
    'format',
    'cost-basis',
];

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

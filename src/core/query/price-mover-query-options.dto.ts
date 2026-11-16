import { RawQueryOptions, SafeQueryOptions } from './safe-query-options.dto';

export const MOVER_DIRECTION_VALUES = ['up', 'down'] as const;
export type MoverDirection = (typeof MOVER_DIRECTION_VALUES)[number];

export const MOVER_RANK_VALUES = ['percent', 'amount'] as const;
export type MoverRank = (typeof MOVER_RANK_VALUES)[number];

/**
 * A move only counts when the card was or is worth at least this much. Without a
 * floor the list is all bulk: a $0.10 card that doubles outranks a $200 card that
 * jumped 40%.
 */
export const DEFAULT_MOVER_MIN_PRICE = 5;

export function safeMoverDirection(value: unknown): MoverDirection | undefined {
    if (typeof value !== 'string') return undefined;
    const lower = value.toLowerCase() as MoverDirection;
    return MOVER_DIRECTION_VALUES.includes(lower) ? lower : undefined;
}

export function safeMoverRank(value: unknown): MoverRank | undefined {
    if (typeof value !== 'string') return undefined;
    const lower = value.toLowerCase() as MoverRank;
    return MOVER_RANK_VALUES.includes(lower) ? lower : undefined;
}

export function safeMinPrice(value: unknown): number | undefined {
    if (typeof value !== 'string' || value.trim() === '') return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export interface RawPriceMoverQueryOptions extends RawQueryOptions {
    by?: string;
    direction?: string;
    minPrice?: string;
}

/**
 * Query for the weekly price movers: the catalog filters, finish and paging of
 * {@link SafeQueryOptions}, plus which way the price moved, whether to rank by
 * percent or dollars, and the price floor.
 */
export class PriceMoverQueryOptions extends SafeQueryOptions {
    readonly by: MoverRank;
    readonly direction: MoverDirection;
    readonly minPrice: number;

    constructor(init?: RawPriceMoverQueryOptions) {
        super(init);
        this.by = safeMoverRank(init?.by) ?? 'percent';
        this.direction = safeMoverDirection(init?.direction) ?? 'up';
        this.minPrice = safeMinPrice(init?.minPrice) ?? DEFAULT_MOVER_MIN_PRICE;
    }
}

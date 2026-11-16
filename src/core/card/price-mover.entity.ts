import { Finish } from 'src/core/query/safe-query-options.dto';
import { Card } from './card.entity';
import { CardRarity } from './card.rarity.enum';

/**
 * One finish of one printing whose price moved over the last week. `change` is
 * the stored weekly change (today's price minus the price a week ago), so
 * `previousPrice` is `price - change`.
 */
export interface PriceMoverRow {
    readonly cardId: string;
    readonly finish: Finish;
    readonly price: number;
    readonly previousPrice: number;
    readonly change: number;
    /** Change as a percentage of `previousPrice`, to one decimal (e.g. 42.5). */
    readonly changePercent: number;
}

/** A weekly move with the card fields the movers filter on. */
export interface WeeklyMove extends PriceMoverRow {
    readonly setCode: string;
    readonly rarity: CardRarity;
    readonly type: string;
}

/** One finish of one printing, e.g. a price left out of the movers. */
export interface PriceFinish {
    readonly cardId: string;
    readonly finish: Finish;
}

export interface PriceMover extends PriceMoverRow {
    readonly card: Card;
}

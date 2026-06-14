import { CashVsCreditResult } from 'src/core/pricing/cash-vs-credit.policy';

/** One buy-list card priced for the optimizer. `unitPrice`/`lineTotal` are null when no price is known. */
export interface OptimizerBuyLine {
    name: string;
    setCode: string;
    number: string;
    finish: 'normal' | 'foil';
    quantity: number;
    unitPrice: number | null;
    lineTotal: number | null;
}

/**
 * Neutral optimizer result shared by the HBS page and the JSON API (6.5).
 * Combines the sell-side cash value (single vendor today), the buy-list retail,
 * and the cash-vs-credit decision so both surfaces present the same numbers.
 */
export interface OptimizerPlan {
    vendorKey: string;
    vendorName: string;
    /** Buylist cash payout for the sell list (the single CK vendor group). */
    cashValue: number;
    sellItemCount: number;
    /** Retail cost of priced buy-list lines. */
    buyListRetail: number;
    buyLines: OptimizerBuyLine[];
    /** Buy-list lines with no current price (excluded from retail). */
    itemsWithoutPrice: number;
    bonusPct: number;
    result: CashVsCreditResult;
}

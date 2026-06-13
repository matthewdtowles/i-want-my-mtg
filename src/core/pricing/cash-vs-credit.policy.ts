/**
 * Cash-vs-store-credit policy (Phase 6.5).
 *
 * Even with a single buylist vendor, there is a real decision: take the cash
 * payout, or take store credit (worth a bonus %) and spend it against the cards
 * you want to buy. Store credit is only worth more than cash to the extent you
 * actually spend it at that vendor — beyond your buy list it is "locked".
 *
 * Inputs:
 *  - cashValue (C):   the buylist cash payout for your sell list (one vendor).
 *  - buyListRetail (R): retail cost of the cards on your buy list.
 *  - bonusPct (b):    store-credit bonus as a fraction (0.30 = +30%).
 *
 * Pure: callers supply C, R and b; this decides which is better and by how much.
 */

export interface CashVsCreditInput {
    cashValue: number;
    buyListRetail: number;
    bonusPct: number;
}

export interface CashVsCreditResult {
    cashValue: number;
    buyListRetail: number;
    bonusPct: number;
    /** C * (1 + b): total store credit offered. */
    storeCredit: number;
    /** Out-of-pocket to buy the list if you took cash: max(0, R - C). */
    cashOutOfPocket: number;
    /** Liquid cash kept if C exceeds the buy list: max(0, C - R). */
    cashLeftover: number;
    /** Out-of-pocket to buy the list with credit: max(0, R - C(1+b)). */
    creditOutOfPocket: number;
    /** Credit left after the buy list, only spendable at the vendor: max(0, C(1+b) - R). */
    lockedCredit: number;
    /** Out-of-pocket saved by taking credit instead of cash (>= 0). */
    creditAdvantage: number;
    /** True when store credit leaves you better off acquiring the buy list. */
    recommendCredit: boolean;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

export function computeCashVsCredit(input: CashVsCreditInput): CashVsCreditResult {
    const cashValue = Math.max(0, input.cashValue || 0);
    const buyListRetail = Math.max(0, input.buyListRetail || 0);
    const bonusPct = Math.max(0, input.bonusPct || 0);

    const storeCredit = cashValue * (1 + bonusPct);

    const cashOutOfPocket = Math.max(0, buyListRetail - cashValue);
    const cashLeftover = Math.max(0, cashValue - buyListRetail);
    const creditOutOfPocket = Math.max(0, buyListRetail - storeCredit);
    const lockedCredit = Math.max(0, storeCredit - buyListRetail);
    const creditAdvantage = cashOutOfPocket - creditOutOfPocket;

    return {
        cashValue: round2(cashValue),
        buyListRetail: round2(buyListRetail),
        bonusPct,
        storeCredit: round2(storeCredit),
        cashOutOfPocket: round2(cashOutOfPocket),
        cashLeftover: round2(cashLeftover),
        creditOutOfPocket: round2(creditOutOfPocket),
        lockedCredit: round2(lockedCredit),
        creditAdvantage: round2(creditAdvantage),
        recommendCredit: creditAdvantage > 0,
    };
}

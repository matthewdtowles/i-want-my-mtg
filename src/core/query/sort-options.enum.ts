export enum SortOptions {
    CARD = 'card.name',
    CARD_SET = 'card.setCode',
    NUMBER = 'card.sortNumber',
    RELEASE_DATE = 'set.releaseDate',
    OWNED_QUANTITY = 'inventory.quantity',
    PRICE = 'prices.normal',
    PRICE_FOIL = 'prices.foil',
    SET = 'set.name',
    SET_CODE = 'set.code',
    SET_BASE_PRICE = 'setPrice.basePrice',
    TX_DATE = 'transaction.date',
    TX_TYPE = 'transaction.type',
    TX_CARD = 'transaction_card.name',
    TX_PRICE = 'transaction.pricePerUnit',
}

export const SortOptionLabels: Record<SortOptions, string> = {
    [SortOptions.CARD]: 'Card',
    [SortOptions.CARD_SET]: 'Set',
    [SortOptions.NUMBER]: 'Card No.',
    [SortOptions.RELEASE_DATE]: 'Release Date',
    [SortOptions.OWNED_QUANTITY]: 'Owned',
    [SortOptions.PRICE]: 'Price',
    [SortOptions.PRICE_FOIL]: 'Foil Price',
    [SortOptions.SET]: 'Set',
    [SortOptions.SET_CODE]: 'Code',
    [SortOptions.SET_BASE_PRICE]: 'Set Value',
    [SortOptions.TX_DATE]: 'Date',
    [SortOptions.TX_TYPE]: 'Type',
    [SortOptions.TX_CARD]: 'Card',
    [SortOptions.TX_PRICE]: 'Price',
};

/**
 * Sort keys each list query can actually honor, grouped by the table aliases the
 * query joins. A sort key outside its context's set references an alias the query
 * never joined, which is a SQL error (e.g. `ORDER BY card.name` on the transaction
 * query, which only joins `transaction_card`).
 *
 * Single source of truth shared by two consumers:
 *   - the ordering paths (`QueryBuilderHelper.applyOrdering`, set `addSetOrdering`)
 *     fall back to the context default when a requested sort is not in the set, so
 *     no caller (HBS, API, internal) can trigger the SQL error;
 *   - the JSON API validator (`validateApiQuery`) 400s a sort outside the set
 *     instead of letting it silently fall back.
 *
 * Card search (`searchByName`) is intentionally absent: it has a fixed name order
 * and ignores `sort` entirely, matching the `search_cards` MCP tool which exposes
 * no sort param.
 */
export const SET_CARD_SORTS = [
    SortOptions.CARD,
    SortOptions.CARD_SET,
    SortOptions.NUMBER,
    SortOptions.PRICE,
    SortOptions.PRICE_FOIL,
] as const;

export const SET_SORTS = [
    SortOptions.SET,
    SortOptions.SET_CODE,
    SortOptions.RELEASE_DATE,
    SortOptions.SET_BASE_PRICE,
] as const;

export const INVENTORY_SORTS = [
    SortOptions.OWNED_QUANTITY,
    SortOptions.CARD,
    SortOptions.CARD_SET,
    SortOptions.NUMBER,
    SortOptions.PRICE,
    SortOptions.PRICE_FOIL,
    SortOptions.SET,
    SortOptions.SET_CODE,
    SortOptions.RELEASE_DATE,
] as const;

export const TRANSACTION_SORTS = [
    SortOptions.TX_DATE,
    SortOptions.TX_TYPE,
    SortOptions.TX_CARD,
    SortOptions.TX_PRICE,
] as const;

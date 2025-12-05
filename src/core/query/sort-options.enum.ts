export enum SortOptions {
    CARD = "card.name",
    CARD_SET = "card.setCode",
    NUMBER = "card.sortNumber",
    RELEASE_DATE = "set.releaseDate",
    OWNED_QUANTITY = "inventory.quantity",
    PRICE = "prices.normal",
    PRICE_FOIL = "prices.foil",
    SET = "set.name",
    SET_CODE = "set.code",
}

export const SortOptionLabels: Record<SortOptions, string> = {
    [SortOptions.CARD]: "Card",
    [SortOptions.CARD_SET]: "Set",
    [SortOptions.NUMBER]: "Card No.",
    [SortOptions.RELEASE_DATE]: "Release Date",
    [SortOptions.OWNED_QUANTITY]: "Owned",
    [SortOptions.PRICE]: "Price",
    [SortOptions.PRICE_FOIL]: "Foil Price",
    [SortOptions.SET]: "Set",
    [SortOptions.SET_CODE]: "Code",
};
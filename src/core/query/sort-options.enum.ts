export enum SortOptions {
    NAME = "name",
    NUMBER = "order",
    RELEASE_DATE = "releaseDate",
    OWNED_QUANTITY = "quantity",
    PRICE = "price.normal",
    PRICE_FOIL = "price.foil",
    SET = "set",
}

export const SortOptionLabels: Record<SortOptions, string> = {
    [SortOptions.NAME]: "Name",
    [SortOptions.NUMBER]: "Set Number",
    [SortOptions.RELEASE_DATE]: "Release Date",
    [SortOptions.OWNED_QUANTITY]: "Owned",
    [SortOptions.PRICE]: "Price",
    [SortOptions.PRICE_FOIL]: "Foil Price",
    [SortOptions.SET]: "Set",
};
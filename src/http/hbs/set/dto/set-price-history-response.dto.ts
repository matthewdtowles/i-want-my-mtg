export class SetPriceHistoryPointDto {
    date: string;
    basePrice: number | null;
    totalPrice: number | null;
    basePriceAll: number | null;
    totalPriceAll: number | null;
}

export class SetPriceHistoryResponseDto {
    setCode: string;
    prices: SetPriceHistoryPointDto[];
}

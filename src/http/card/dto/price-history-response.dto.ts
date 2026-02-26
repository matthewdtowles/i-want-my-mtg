export class PriceHistoryPointDto {
    date: string;
    normal: number | null;
    foil: number | null;
}

export class PriceHistoryResponseDto {
    cardId: string;
    prices: PriceHistoryPointDto[];
}

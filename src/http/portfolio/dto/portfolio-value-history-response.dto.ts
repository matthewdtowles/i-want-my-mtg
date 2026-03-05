export class PortfolioValueHistoryPointDto {
    date: string;
    totalValue: number;
    totalCost: number | null;
    totalCards: number;
}

export class PortfolioValueHistoryResponseDto {
    history: PortfolioValueHistoryPointDto[];
}

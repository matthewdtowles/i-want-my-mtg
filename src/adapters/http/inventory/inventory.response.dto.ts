export class InventoryCardResponseDto {
    cardId: number;
    isFoil: boolean;
    quantity: number;
    displayValue: string;
    imgSrc: string;
    isReserved: boolean;
    manaCost?: string[];
    name: string;
    rarity: string;
    setCode: string;
    url: string;
}
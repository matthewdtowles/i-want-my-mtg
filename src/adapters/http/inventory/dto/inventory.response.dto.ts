export class InventoryResponseDto {
    cardId: string;
    isFoil: boolean;
    quantity: number;
    priceValue: string;
    imgSrc: string;
    isReserved: boolean;
    name: string;
    rarity: string;
    setCode: string;
    url: string;

    constructor(init: Partial<InventoryResponseDto>) {
        this.cardId = init.cardId || "";
        this.isFoil = init.isFoil || false;
        this.quantity = init.quantity || 0;
        this.priceValue = init.priceValue || "";
        this.imgSrc = init.imgSrc || "";
        this.isReserved = init.isReserved || false;
        this.name = init.name || "";
        this.rarity = init.rarity || "";
        this.setCode = init.setCode || "";
        this.url = init.url || "";
    }
}
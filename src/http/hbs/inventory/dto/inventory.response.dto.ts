export class InventoryResponseDto {
    readonly cardId: string;
    readonly isFoil: boolean;
    readonly quantity: number;
    readonly priceValue: string;
    readonly imgSrc: string;
    readonly name: string;
    readonly rarity: string;
    readonly setCode: string;
    readonly url: string;
    readonly tags: string[];

    constructor(init: Partial<InventoryResponseDto>) {
        this.cardId = init.cardId || '';
        this.isFoil = init.isFoil || false;
        this.quantity = init.quantity || 0;
        this.priceValue = init.priceValue || '';
        this.imgSrc = init.imgSrc || '';
        this.name = init.name || '';
        this.rarity = init.rarity || '';
        this.setCode = init.setCode || '';
        this.url = init.url || '';
        this.tags = init.tags || [];
    }
}

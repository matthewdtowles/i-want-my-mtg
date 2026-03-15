// Base card response DTO for HBS views

export interface ManaToken {
    readonly symbol?: string;
    readonly sep?: string;
    readonly isHalf?: boolean;
}

export class CardResponseDto {
    readonly cardId: string;
    readonly hasFoil: boolean;
    readonly hasNormal: boolean;
    readonly imgSrc: string;
    readonly manaCost: ManaToken[];
    readonly name: string;
    readonly number: string;
    readonly rarity: string;
    readonly setCode: string;
    readonly type: string;
    readonly url: string;
    readonly foilPrice?: string;
    readonly foilQuantity?: number;
    readonly normalPrice?: string;
    readonly normalQuantity?: number;
    readonly priceChangeWeekly?: string;
    readonly priceChangeWeeklySign?: string;
    readonly foilPriceChangeWeekly?: string;
    readonly foilPriceChangeWeeklySign?: string;
    readonly normalPriceRaw?: number;
    readonly foilPriceRaw?: number;
    readonly tags: string[];

    constructor(init: Partial<CardResponseDto>) {
        this.cardId = init.cardId || '';
        this.hasFoil = init.hasFoil || false;
        this.hasNormal = init.hasNormal || false;
        this.imgSrc = init.imgSrc || '';
        this.manaCost = init.manaCost || [];
        this.name = init.name || '';
        this.number = init.number || '';
        this.rarity = init.rarity || '';
        this.setCode = init.setCode || '';
        this.type = init.type || '';
        this.url = init.url || '';
        this.foilPrice = init.foilPrice || '';
        this.foilQuantity = init.foilQuantity || 0;
        this.normalPrice = init.normalPrice || '';
        this.normalQuantity = init.normalQuantity || 0;
        this.priceChangeWeekly = init.priceChangeWeekly || '';
        this.priceChangeWeeklySign = init.priceChangeWeeklySign || '';
        this.foilPriceChangeWeekly = init.foilPriceChangeWeekly || '';
        this.foilPriceChangeWeeklySign = init.foilPriceChangeWeeklySign || '';
        this.normalPriceRaw = init.normalPriceRaw || 0;
        this.foilPriceRaw = init.foilPriceRaw || 0;
        this.tags = init.tags || [];
    }
}

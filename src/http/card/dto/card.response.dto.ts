// Base card response DTO for HBS views

export interface ManaToken {
    readonly symbol?: string;
    readonly sep?: string;
}

export class CardResponseDto {

    readonly cardId: string;
    readonly hasFoil: boolean;
    readonly hasNormal: boolean;
    readonly imgSrc: string;
    readonly isReserved: boolean;
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

    constructor(init: Partial<CardResponseDto>) {
        this.cardId = init.cardId || "";
        this.hasFoil = init.hasFoil || false;
        this.hasNormal = init.hasNormal || false;
        this.imgSrc = init.imgSrc || "";
        this.isReserved = init.isReserved || false;
        this.manaCost = init.manaCost || [];
        this.name = init.name || "";
        this.number = init.number || "";
        this.rarity = init.rarity || "";
        this.setCode = init.setCode || "";
        this.type = init.type || "";
        this.url = init.url || "";
        this.foilPrice = init.foilPrice || "";
        this.foilQuantity = init.foilQuantity || 0;
        this.normalPrice = init.normalPrice || "";
        this.normalQuantity = init.normalQuantity || 0;
    }
}
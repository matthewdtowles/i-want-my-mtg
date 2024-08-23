export class CardDto {
    readonly id: number;
    readonly imgSrc: string;
    readonly isReserved?: boolean;
    readonly manaCost?: string[];
    readonly name: string;
    readonly number: string;
    readonly originalText?: string;
    readonly rarity: string;
    readonly setCode: string;
    readonly url: string;
    readonly uuid: string;
}

import { Set } from '../set/set';

export class Card {
    id: number;
    imgSrc: string;
    isReserved?: boolean;
    manaCost?: string;
    name: string;
    number: string;
    originalText?: string;
    rarity: string;
    set: Set;
    url: string;
    uuid: string;
}

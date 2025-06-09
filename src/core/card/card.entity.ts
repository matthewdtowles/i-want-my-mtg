import { CardRarity, Legality } from "src/core/card";
import { Price } from "src/core/price";
import { Set } from "src/core/set";


export class Card {
    id: string;
    artist?: string;
    hasFoil: boolean;
    hasNonFoil: boolean;
    imgSrc: string;
    isReserved: boolean;
    legalities: Legality[];
    manaCost?: string;
    name: string;
    number: string;
    oracleText?: string;
    order: number;
    prices: Price[];
    rarity: CardRarity;
    set: Set;
    setCode: string;
    type: string;
}

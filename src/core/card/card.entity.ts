import { Price } from "src/core/price/price.entity";
import { Set } from "src/core/set/set.entity";
import { CardRarity } from "./api/card.rarity.enum";
import { Legality } from "./legality.entity";


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

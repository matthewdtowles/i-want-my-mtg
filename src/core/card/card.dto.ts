import { CardRarity, CreateLegalityDto } from "src/core/card";
import { PriceDto } from "src/core/price";
import { SetDto } from "src/core/set";


export class CardDto {
    readonly id: string;
    readonly artist?: string;
    readonly hasFoil: boolean;
    readonly hasNonFoil: boolean;
    readonly imgSrc: string;
    readonly isReserved: boolean;
    readonly legalities?: CreateLegalityDto[];
    readonly manaCost?: string[];
    readonly name: string;
    readonly number: string;
    readonly oracleText?: string;
    readonly order: number;
    readonly prices: PriceDto[];
    readonly rarity: CardRarity;
    readonly set?: SetDto;
    readonly setCode: string;
    readonly type: string;
    readonly url: string;
}
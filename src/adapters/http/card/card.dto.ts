import { CreateLegalityDto } from "src/adapters/http/card/create-legality.dto";
import { PriceDto } from "src/adapters/http/price/price.dto";
import { SetDto } from "src/adapters/mtgjson-ingestion/dto/set.dto";
import { CardRarity } from "src/core/card";


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
import { LegalityDto } from "src/core/card/api/legality.dto";
import { SetDto } from "src/core/set/api/set.dto";

export class CardDto {
    readonly id: number;
    readonly artist?: string;
    readonly imgSrc: string;
    readonly isReserved: boolean;
    readonly legalities?: LegalityDto[];
    readonly manaCost?: string[];
    readonly name: string;
    readonly number: string;
    readonly oracleText?: string;
    readonly rarity: string;
    readonly set?: SetDto;
    readonly setCode: string;
    readonly type: string;
    readonly url: string;
    readonly uuid: string;
}
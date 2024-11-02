import { Type } from "class-transformer";
import { CardDto } from "src/core/card/api/card.dto";

export class SetDto {
    readonly baseSize: number;
    readonly block?: string;

    @Type(() => CardDto)
    readonly cards: CardDto[];

    readonly code: string;
    readonly keyruneCode: string;
    readonly name: string;
    readonly parentCode?: string;
    readonly releaseDate: string;
    readonly type: string;
    readonly url: string;
}
